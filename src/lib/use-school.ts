import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listMySchools } from "@/lib/schools.functions";

export interface MySchool {
  id: string;
  name: string;
  subsystem: "FR" | "EN";
  logo_url: string | null;
  address: string | null;
  motto: string | null;
  role: string;
}

export function useSchool() {
  const listFn = useServerFn(listMySchools);
  const q = useQuery({ queryKey: ["my-schools"], queryFn: () => listFn() });
  const school = (q.data?.[0] as MySchool | undefined) ?? undefined;
  return { school, isLoading: q.isLoading, query: q };
}
