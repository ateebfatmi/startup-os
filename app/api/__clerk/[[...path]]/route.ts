import { createFrontendApiProxyHandlers } from "@clerk/nextjs/server";

export const { GET, POST, PUT, DELETE, PATCH } = createFrontendApiProxyHandlers({
  proxyPath: "/__clerk",
});
