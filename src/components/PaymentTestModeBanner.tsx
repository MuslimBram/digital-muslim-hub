const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string | undefined;

export function PaymentTestModeBanner() {
  if (!clientToken?.startsWith("test_")) return null;
  return (
    <div className="w-full border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-center text-xs text-amber-700 dark:text-amber-300">
      🧪 Modaliteti i testimit — pagesat janë në sandbox dhe nuk tarifohen.
    </div>
  );
}