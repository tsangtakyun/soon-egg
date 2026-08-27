export type SubtitleSessionStatus = "pending" | "transcribing" | "refining" | "ready" | "error";

export type SubtitleSession = {
  id: string;
  created_at: string;
  title: string | null;
  video_url: string | null;
  duration_seconds: number | null;
  status: SubtitleSessionStatus;
  error_message: string | null;
  original_filename: string | null;
  original_size_bytes: number | null;
  compressed_size_bytes: number | null;
  line_count: number | null;
};

export type SubtitleLine = {
  id: string;
  session_id: string;
  line_index: number;
  start_time: number;
  end_time: number;
  raw_text: string;
  refined_text: string | null;
  display_text: string;
  is_edited: boolean;
  is_hallucination: boolean | null;
  parent_line_id: string | null;
  created_at: string;
};
