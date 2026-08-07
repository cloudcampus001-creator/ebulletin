import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listSequences = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ schoolId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("sequences")
      .select("id, index, name, status, term_id, terms(id, index, name)")
      .eq("school_id", data.schoolId)
      .order("index", { ascending: true });
    if (error) throw error;
    return rows ?? [];
  });

export const setSequenceStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      schoolId: z.string().uuid(),
      sequenceId: z.string().uuid(),
      status: z.enum(["open", "closed"]),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    if (data.status === "open") {
      // Enforce a single open sequence per school so the teacher flow is deterministic.
      const { error: closeErr } = await supabase
        .from("sequences")
        .update({ status: "closed" })
        .eq("school_id", data.schoolId)
        .neq("id", data.sequenceId);
      if (closeErr) throw closeErr;
    }
    const { error } = await supabase
      .from("sequences")
      .update({ status: data.status })
      .eq("id", data.sequenceId);
    if (error) throw error;
    return { ok: true };
  });
