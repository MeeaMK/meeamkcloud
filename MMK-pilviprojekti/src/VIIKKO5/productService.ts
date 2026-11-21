import { type Product } from "./Product";

export async function fetchRandomProduct(): Promise<Product> {
  const res = await fetch(
    "https://dummyjson.com/products?limit=100"
  );

  if (!res.ok) {
    throw new Error("Tuotteiden haku epäonnistui");
  }

  const data = await res.json();

  const products: Product[] = data.products;

  const randomIndex = Math.floor(
    Math.random() * products.length
  );

  return products[randomIndex];
}