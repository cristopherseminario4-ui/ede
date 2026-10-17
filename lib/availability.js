import { ZONES } from "@/lib/config";
import { soldByZone } from "@/lib/orders";

export function availability() {
  const sold = soldByZone();
  return Object.fromEntries(
    ZONES.map((z) => {
      const s = sold[z.id] || 0;
      return [z.id, { seats: z.seats, sold: s, left: Math.max(0, z.seats - s) }];
    })
  );
}
