import type { Metadata } from "next";
import "../client/global.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Futebol Dashboard",
  description: "Organize seu campeonato",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
