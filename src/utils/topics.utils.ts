import { DateTime } from "luxon";

export function extractRevisionBooleans({ lastRevised, revisionDate }: { lastRevised: string; revisionDate: string }) {
  const last_revised = DateTime.fromISO(lastRevised).startOf("day") || null;
  const next_revision = DateTime.fromISO(revisionDate).startOf("day");
  const revised: boolean = last_revised.hasSame(DateTime.now(), "day");
  const today: boolean = revised || next_revision <= DateTime.now();
  return { revised, today, next_revision };
}

export function reviseBtnText(revised: boolean, isHovering: boolean) {
  let btnString = revised ? "Revised" : "Revise";

  if (isHovering) {
    btnString = revised ? "Undo Revise" : "Revise Now";
  }
  return btnString;
}
