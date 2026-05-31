import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { getSubjects } from "../service/topic_service.mjs";

export function useSubjectSuggestions(input: string, debounceMs = 300) {
  const [debouncedInput, setDebouncedInput] = useState(input);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedInput(input), debounceMs);
    return () => clearTimeout(timer);
  }, [input, debounceMs]);

  const { data = [] } = useQuery({
    queryKey: ["subjects", debouncedInput],
    queryFn: () => getSubjects(debouncedInput),
    enabled: debouncedInput.length > 2,
    staleTime: 60_000,
  });

  return data as string[];
}
