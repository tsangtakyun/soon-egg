import { NextResponse } from 'next/server';
import { quotationContext } from '@/lib/quotation-context';
import { calculateQuote, quoteNumber, type QuoteInput } from '@/lib/reply-quotation';
import { quotationPrefill } from '@/lib/quotation-prefill';

export async function GET(request: Request) {
  const context = await quotationContext(request);
  if (!context) return NextResponse.json({ error: '請先登入' }, { status: 401 });
  const projectId = new URL(request.url).searchParams.get('projectId');
  if (!projectId) return NextResponse.json({ error: '請選擇項目' }, { status: 400 });
  const [{ data: project }, { data: profile }, { data: quotations }] = await Promise.all([
    context.admin.from('egg_reply_projects').select('id,name,brief,lifecycle_status').eq('id', projectId).eq('creator_id', context.workspaceId).neq('lifecycle_status', 'archived').maybeSingle(),
    context.admin.from('egg_quote_profiles').select('currency,commercial_rules,payment_profile,updated_at').eq('workspace_id', context.workspaceId).maybeSingle(),
    context.admin.from('egg_quotations').select('id,quote_number,version,status,snapshot,access_token,approved_at,sent_at,created_at').eq('workspace_id', context.workspaceId).eq('project_id', projectId).order('created_at', { ascending: false }),
  ]);
  if (!project) return NextResponse.json({ error: '已封存或無權限嘅項目不可查看報價' }, { status: 409 });
  const currency = profile?.currency || 'HKD';
  return NextResponse.json({ project, profile, prefill: quotationPrefill(project.brief ?? {}, currency), quotations: quotations ?? [], canApprove: context.role === 'owner' || context.role === 'admin' });
}

export async function POST(request: Request) {
  const context = await quotationContext(request);
  if (!context) return NextResponse.json({ error: '請先登入' }, { status: 401 });
  const body = await request.json().catch(() => ({})) as QuoteInput & { action?: string; quotationId?: string; commercialRules?: Record<string, unknown>; paymentProfile?: Record<string, unknown>; currency?: string };

  if (body.action === 'save_profile') {
    if (context.role !== 'owner' && context.role !== 'admin') return NextResponse.json({ error: '只有擁有者或管理員可修改報價及收款設定' }, { status: 403 });
    const { error } = await context.admin.from('egg_quote_profiles').upsert({ workspace_id: context.workspaceId, currency: body.currency || 'HKD', commercial_rules: body.commercialRules ?? {}, payment_profile: body.paymentProfile ?? {}, updated_by: context.userId, updated_at: new Date().toISOString() }, { onConflict: 'workspace_id' });
    return error ? NextResponse.json({ error: '未能儲存報價設定' }, { status: 500 }) : NextResponse.json({ success: true });
  }

  if (body.action === 'approve' || body.action === 'sent') {
    if (!body.quotationId) return NextResponse.json({ error: '缺少報價單' }, { status: 400 });
    if (context.role !== 'owner' && context.role !== 'admin') return NextResponse.json({ error: '需要擁有者或管理員批准' }, { status: 403 });
    const { data: current } = await context.admin.from('egg_quotations').select('id,status,snapshot').eq('id', body.quotationId).eq('workspace_id', context.workspaceId).maybeSingle();
    if (!current) return NextResponse.json({ error: '找不到報價單' }, { status: 404 });
    if (current.status === 'sent') return NextResponse.json({ error: '已發送版本不可修改，請建立新版本' }, { status: 409 });
    const blockers = [...((current.snapshot as { missing?: string[] }).missing ?? []), ...((current.snapshot as { conflicts?: string[] }).conflicts ?? [])];
    if (blockers.length) return NextResponse.json({ error: '仍有未確認資料，暫時不可正式批核', blockers }, { status: 409 });
    if (body.action === 'sent' && current.status !== 'approved') return NextResponse.json({ error: '請先批核報價單' }, { status: 409 });
    const patch = body.action === 'approve' ? { status: 'approved', approved_by: context.userId, approved_at: new Date().toISOString(), updated_at: new Date().toISOString() } : { status: 'sent', sent_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    const { data, error } = await context.admin.from('egg_quotations').update(patch).eq('id', current.id).eq('workspace_id', context.workspaceId).select('id,quote_number,version,status,snapshot,access_token,approved_at,sent_at,created_at').single();
    return error ? NextResponse.json({ error: '未能更新報價單狀態' }, { status: 500 }) : NextResponse.json({ quotation: data });
  }

  if (!body.projectId) return NextResponse.json({ error: '請選擇項目' }, { status: 400 });
  const [{ data: project }, { data: profile }] = await Promise.all([
    context.admin.from('egg_reply_projects').select('id,name,brief,lifecycle_status').eq('id', body.projectId).eq('creator_id', context.workspaceId).neq('lifecycle_status', 'archived').maybeSingle(),
    context.admin.from('egg_quote_profiles').select('currency,commercial_rules,payment_profile').eq('workspace_id', context.workspaceId).maybeSingle(),
  ]);
  if (!project) return NextResponse.json({ error: '已封存或無權限嘅項目不可建立報價' }, { status: 409 });
  const { snapshot, canIssue } = calculateQuote(project.brief ?? {}, { ...body, currency: body.currency || profile?.currency || 'HKD' }, (profile?.commercial_rules ?? {}) as Record<string, unknown>);
  const { data: prior } = await context.admin.from('egg_quotations').select('version').eq('workspace_id', context.workspaceId).eq('project_id', project.id).order('version', { ascending: false }).limit(1).maybeSingle();
  const version = (prior?.version ?? 0) + 1;
  const { data: sequence, error: sequenceError } = await context.admin.rpc('next_egg_quote_sequence', { target_workspace: context.workspaceId });
  if (sequenceError || !sequence) return NextResponse.json({ error: '未能建立唯一報價編號' }, { status: 500 });
  const { data, error } = await context.admin.from('egg_quotations').insert({ workspace_id: context.workspaceId, project_id: project.id, quote_number: quoteNumber(context.workspaceId, Number(sequence)), version, status: 'draft', snapshot: { ...snapshot, paymentProfile: profile?.payment_profile ?? {} }, created_by: context.userId }).select('id,quote_number,version,status,snapshot,access_token,approved_at,sent_at,created_at').single();
  if (error) return NextResponse.json({ error: '未能建立報價草稿' }, { status: 500 });
  return NextResponse.json({ quotation: data, canIssue, blockers: [...snapshot.missing, ...snapshot.conflicts] }, { status: 201 });
}
