import { OkContent } from "./ok-content";

type OkPageProps = {
  searchParams: Promise<{
    usuario?: string;
  }>;
};

export default async function OkPage({ searchParams }: OkPageProps) {
  const { usuario } = await searchParams;

  return <OkContent usuario={usuario} />;
}
