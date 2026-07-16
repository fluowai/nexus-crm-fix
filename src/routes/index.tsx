import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { store } from "@/lib/store";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    store.init();
    setHasSession(!!store.get().session);
    setReady(true);
  }, []);

  if (!ready) return null;
  return <Navigate to={hasSession ? "/dashboard" : "/signin"} />;
}
