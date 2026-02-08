import Link from "next/link";

type ExchangeCardProps = {
  name: string;
  href?: string;
};

export function ExchangeCard({ name, href = "#" }: ExchangeCardProps) {
  return (
    <Link
      href={href}
      className="flex aspect-square flex-col justify-center p-4 rounded-xl border border-border bg-surfaceAlt hover:bg-input/50 transition-colors"
    >
      <p className="text-white text-base font-medium leading-normal">{name}</p>
    </Link>
  );
}
