"use client";

import React, { createContext, useContext, useState } from "react";
import { PlateModel } from "@/lib/types";

interface StorefrontContextType {
  model: PlateModel;
  setModel: (m: PlateModel) => void;
  plateText: string;
  setPlateText: (t: string) => void;
  quantity: number;
  setQuantity: (q: number) => void;
  bracket: boolean;
  setBracket: (b: boolean) => void;
  district: string;
  setDistrict: (d: string) => void;
}

const StorefrontContext = createContext<StorefrontContextType | undefined>(undefined);

export function StorefrontProvider({ children }: { children: React.ReactNode }) {
  const [model, setModel] = useState<PlateModel>("A");
  const [plateText, setPlateText] = useState("ঢাকা মেট্রো-ল ১২-৩৪৫৬");
  const [quantity, setQuantity] = useState(1);
  const [bracket, setBracket] = useState(false);
  const [district, setDistrict] = useState("Dhaka");

  return (
    <StorefrontContext.Provider
      value={{
        model,
        setModel,
        plateText,
        setPlateText,
        quantity,
        setQuantity,
        bracket,
        setBracket,
        district,
        setDistrict,
      }}
    >
      {children}
    </StorefrontContext.Provider>
  );
}

export function useStorefront() {
  const context = useContext(StorefrontContext);
  if (!context) {
    throw new Error("useStorefront must be used within a StorefrontProvider");
  }
  return context;
}
