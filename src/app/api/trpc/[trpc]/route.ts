import { createTRPCContext } from "@/server/context";
import { appRouter } from "@/server/routers/_app";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import type { NextRequest } from "next/server";

const handler = (req: NextRequest) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: createTRPCContext,
    onError({ path, error }) {
      if (process.env.NODE_ENV === "development") {
        console.error(
          `tRPC error on ${path ?? "unknown"}:`,
          error.message
        );
      }
    },
  });

export { handler as GET, handler as POST };
