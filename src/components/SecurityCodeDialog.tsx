import { useEffect, useState } from "react";
import { Shield, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/auth/AuthProvider";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  onConfirmed: () => void | Promise<void>;
}

export function SecurityCodeDialog({
  open,
  onOpenChange,
  title = "Konfirmo me kod sigurie",
  description = "Vendos kodin tënd 4–6-shifror për të vazhduar.",
  onConfirmed,
}: Props) {
  const { user } = useAuth();
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (!open) setCode("");
  }, [open]);

  const handleConfirm = async () => {
    if (!user) return;
    if (code.length < 4) {
      toast.error("Vendos të paktën 4 shifra");
      return;
    }
    setVerifying(true);
    try {
      const { data, error } = await supabase.rpc("verify_security_code", {
        _user_id: user.id,
        _code: code,
      });
      if (error) throw error;
      if (!data) {
        toast.error("Kod i pasaktë");
        setCode("");
        return;
      }
      onOpenChange(false);
      await onConfirmed();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Gabim gjatë verifikimit";
      toast.error(msg);
    } finally {
      setVerifying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center">{title}</DialogTitle>
          <DialogDescription className="text-center">{description}</DialogDescription>
        </DialogHeader>
        <div className="flex justify-center py-4">
          <InputOTP maxLength={6} value={code} onChange={setCode} pattern="^\d+$" autoFocus>
            <InputOTPGroup>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <InputOTPSlot key={i} index={i} />
              ))}
            </InputOTPGroup>
          </InputOTP>
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={verifying}>
            Anulo
          </Button>
          <Button onClick={handleConfirm} disabled={verifying || code.length < 4} className="flex-1">
            {verifying ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Po verifikohet…</> : "Konfirmo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}