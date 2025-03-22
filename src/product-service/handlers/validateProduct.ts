export const validateProduct = (product: any) => {
  if (!product.title) return 'The "title" attribute is required';
  if (!product.description) return 'The "description" attribute is required';
  if (!product.price) return 'The "price" attribute is required';
  if (typeof product.price !== "number")
    return 'The "price" attribute must be string';
  if (product.price < 0) return "price must be positive number";
  if (!product.count) return 'The "count" attribute is required';
  if (typeof product.count !== "number")
    return 'The "count" attribute is required';
  if (product.count < 0) return "count must be positive number";
  return "";
};
