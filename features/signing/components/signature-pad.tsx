"use client";

import { useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import type { SavedSignature, SignaturePayload } from "@/features/signing/types";

interface SignaturePadProps {
  isInitials?: boolean;
  savedSignature?: SavedSignature | null;
  onSave: (payload: SignaturePayload) => void;
  onClose: () => void;
}

export function SignaturePad({
  isInitials,
  savedSignature = null,
  onSave,
  onClose,
}: SignaturePadProps) {
  const canvasRef = useRef<SignatureCanvas>(null);
  const [typedText, setTypedText] = useState("");
  const [activeTab, setActiveTab] = useState("draw");
  const hasSavedSignature = Boolean(savedSignature);

  function handleSave() {
    if (activeTab === "saved") {
      if (!savedSignature) return;
      onSave({ signaturePath: savedSignature.path });
      return;
    }

    if (activeTab === "draw") {
      if (canvasRef.current?.isEmpty()) return;
      const dataUrl = canvasRef.current!.toDataURL("image/png");
      onSave({ dataUrl });
    } else {
      if (!typedText.trim()) return;
      const canvas = window.document.createElement("canvas");
      canvas.width = isInitials ? 200 : 500;
      canvas.height = isInitials ? 100 : 150;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "black";
      ctx.font = `${
        isInitials ? "40" : "48"
      }px 'Brush Script MT', 'Dancing Script', cursive, serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(typedText, canvas.width / 2, canvas.height / 2);
      onSave({ dataUrl: canvas.toDataURL("image/png") });
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isInitials ? "Add Your Initials" : "Add Your Signature"}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full">
            <TabsTrigger value="draw" className="flex-1">
              Draw
            </TabsTrigger>
            <TabsTrigger value="type" className="flex-1">
              Type
            </TabsTrigger>
            {hasSavedSignature && (
              <TabsTrigger value="saved" className="flex-1">
                Saved
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="draw" className="mt-4">
            <div className="border-2 border-dashed border-border rounded-lg overflow-hidden">
              <SignatureCanvas
                ref={canvasRef}
                canvasProps={{
                  width: isInitials ? 300 : 450,
                  height: isInitials ? 120 : 150,
                  className: "w-full",
                }}
                penColor="black"
              />
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2"
              onClick={() => canvasRef.current?.clear()}
            >
              Clear
            </Button>
          </TabsContent>

          <TabsContent value="type" className="mt-4 space-y-4">
            <Input
              value={typedText}
              onChange={(e) => setTypedText(e.target.value)}
              placeholder={isInitials ? "Your initials" : "Type your full name"}
              className="text-lg"
            />
            {typedText && (
              <div className="border rounded-lg p-6 text-center">
                <p
                  style={{
                    fontFamily:
                      "'Brush Script MT', 'Dancing Script', cursive, serif",
                    fontSize: isInitials ? "32px" : "40px",
                  }}
                >
                  {typedText}
                </p>
              </div>
            )}
          </TabsContent>

          {hasSavedSignature && savedSignature && (
            <TabsContent value="saved" className="mt-4 space-y-4">
              <div className="border rounded-lg p-6 flex items-center justify-center bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={savedSignature.url}
                  alt="Saved signature preview"
                  className="max-h-32 max-w-full object-contain"
                />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Use your previously saved {isInitials ? "initials" : "signature"}.
              </p>
            </TabsContent>
          )}
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            {activeTab === "saved"
              ? "Use Saved"
              : isInitials
                ? "Apply Initials"
                : "Apply Signature"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
