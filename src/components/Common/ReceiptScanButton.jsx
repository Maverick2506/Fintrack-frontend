import { useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import dashboardService from "../../services/dashboardService";
import { receiptFileProblem, RECEIPT_MAX_BYTES } from "../../utils/receiptDraft";

// Phone photos are often 3-8 MB; a 2000 px JPEG reads just as well and uploads in a second
const MAX_SIDE = 2000;
const shrinkPhoto = async (file) => {
  if (typeof createImageBitmap !== "function" || !/^image\/(jpeg|jpg|png|webp)$/i.test(file.type)) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size <= 1.5 * 1024 * 1024) {
      bitmap.close?.();
      return file;
    }
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    return blob && blob.size < file.size ? blob : file;
  } catch {
    // HEIC and odd files: send as picked (the server checks them)
    return file;
  }
};

const errorText = (err) => {
  const status = err?.response?.status;
  if (err?.response?.data?.error) return err.response.data.error;
  if (!err?.response) return "No connection. Reading a receipt needs the internet.";
  if (status === 413) return "The photo is over 5 MB.";
  return "Couldn't read the receipt. Try again or enter it by hand.";
};

/**
 * Camera button (AI5): takes or picks a receipt photo, asks the server for a draft and hands it to
 * onDraft. Nothing is saved; the form it fills still needs Save. The photo is not kept anywhere.
 */
const ReceiptScanButton = ({ onDraft, label = "Scan receipt", className = "", labelClassName = "hidden sm:inline", disabled = false }) => {
  const inputRef = useRef(null);
  const [isReading, setIsReading] = useState(false);

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const problem = receiptFileProblem(file);
    if (problem) {
      toast.error(problem);
      return;
    }
    setIsReading(true);
    try {
      const image = await shrinkPhoto(file);
      if (image.size > RECEIPT_MAX_BYTES) {
        toast.error("The photo is over 5 MB. Take it again or pick a smaller one.");
        return;
      }
      const name = image === file ? file.name || "receipt.jpg" : "receipt.jpg";
      const draft = await dashboardService.categorizeReceipt(image, name);
      onDraft(draft);
    } catch (err) {
      console.error("Receipt scan failed:", err);
      toast.error(errorText(err));
    } finally {
      setIsReading(false);
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFile}
        aria-hidden="true"
        tabIndex={-1}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled || isReading}
        aria-label={isReading ? "Reading receipt" : label}
        title={label}
        className={`inline-flex items-center justify-center gap-1.5 min-h-10 min-w-10 rounded-lg border border-white/[0.08] bg-zinc-900 text-xs font-medium text-zinc-300 hover:text-zinc-100 hover:border-white/20 disabled:opacity-50 cursor-pointer transition-colors ${className}`}
      >
        {isReading ? <Loader2 size={15} className="animate-spin text-emerald-400" /> : <Camera size={15} />}
        {label && <span className={labelClassName}>{isReading ? "Reading…" : label}</span>}
      </button>
    </>
  );
};

export default ReceiptScanButton;
