const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string | undefined;

export function PaymentTestModeBanner() {
  if (!clientToken?.startsWith("test_")) return null;
  return (
    <div className="w-full border-b border-warning/30 bg-warning/10 px-4 py-2 text-center text-xs text-warning-foreground">
      🧪 Modaliteti i testimit — pagesat janë në sandbox dhe nuk tarifohen.
    </div>
  );
}