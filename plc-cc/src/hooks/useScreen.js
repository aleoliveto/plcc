import { useEffect, useState } from "react";

export function useScreen() {
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 1440);
  useEffect(() => {
    const onR = () => setW(window.innerWidth);
    window.addEventListener("resize", onR);
    return () => window.removeEventListener("resize", onR);
  }, []);
  const isPhone = w <= 480;
  const isTablet = w > 480 && w <= 1024;
  const isDesktop = w > 1024;
  return { width: w, isPhone, isTablet, isDesktop };
}
