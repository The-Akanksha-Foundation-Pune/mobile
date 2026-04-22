import { useEffect, useState } from "react";
import { Linking } from "react-native";
import { resolveRoute } from "../utils/routing";
import type { AppRoute } from "../types/app";

export function useAppRoute() {
  const [route, setRoute] = useState<AppRoute>("home");

  useEffect(() => {
    void Linking.getInitialURL().then((url) => {
      setRoute(resolveRoute(url));
    });

    const linkingSubscription = Linking.addEventListener("url", ({ url }) => {
      setRoute(resolveRoute(url));
    });

    return () => {
      linkingSubscription.remove();
    };
  }, []);

  return { route, setRoute };
}
