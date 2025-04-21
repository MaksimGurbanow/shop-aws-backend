interface Product {
  id: number | string;
  title: string;
  price: number;
  description: string;
  count: number;
}

export const products: Product[] = [
  {
    id: '1',
    title: 'BMW X5',
    price: 100000,
    description: 'This is BMW X5',
    count: 10,
  },
  {
    id: '6',
    title: 'Audi Q7',
    price: 153200,
    description: 'This is Audi Q7',
    count: 0,
  },
  {
    id: '5',
    title: "Mazda CX-5",
    price: 1500,
    description: 'This is Mazda CX-5',
    count: 2,
  },
  {
    id: '4',
    title: 'Toyota Camry',
    price: 16000,
    description: 'This is Toyota Camry',
    count: 0,
  },
  {
    id: '3',
    title: 'Hundai Sonata',
    price: 16000,
    description: 'This is Hunday Sonata',
    count: 1,
  },
  {
    id: '2',
    title: 'Wolkswagen Passat',
    price: 150000,
    description: 'This is Wolkswagen Passat',
    count: 10,
  }
];
