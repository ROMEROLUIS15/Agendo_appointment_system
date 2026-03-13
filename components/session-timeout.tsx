"use client";

import { useEffect, useCallback, useRef } from "react";
import { signout } from "@/app/login/actions";

// 30 minutes in milliseconds
const TIMEOUT_MS = 30 * 60 * 1000;

export function SessionTimeout() {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const resetTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      // User has been inactive for TIMEOUT_MS
      signout();
    }, TIMEOUT_MS);
  }, []);

  useEffect(() => {
    // Escuchar eventos de interacción del usuario
    const events = [
      "mousemove",
      "keydown",
      "scroll",
      "click",
      "touchstart",
    ];

    const handleUserActivity = () => {
      resetTimeout();
    };

    // Registrar los listeners
    events.forEach((event) => {
      window.addEventListener(event, handleUserActivity);
    });

    // Iniciar temporizador inicial
    resetTimeout();

    return () => {
      // Limpiar listeners y timeout al desmontar
      events.forEach((event) => {
        window.removeEventListener(event, handleUserActivity);
      });
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [resetTimeout]);

  return null;
}
