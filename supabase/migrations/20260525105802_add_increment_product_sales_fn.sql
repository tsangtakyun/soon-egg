
CREATE OR REPLACE FUNCTION increment_product_sales(p_product_id uuid, p_amount numeric)
RETURNS void AS $$
BEGIN
  UPDATE egg_digital_products
  SET
    total_sales = COALESCE(total_sales, 0) + 1,
    total_revenue = COALESCE(total_revenue, 0) + p_amount
  WHERE id = p_product_id;
END;
$$ LANGUAGE plpgsql;
;
