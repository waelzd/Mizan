export type Category = {
  id: string;
  name: string;
  color: string;
  icon: string;
};

export type Expense = {
  id: string;
  amount: number; // cents
  categoryId: string;
  date: string; // ISO string
  note?: string | undefined;
  createdAt: string;
};

export type Theme = "light" | "dark";
