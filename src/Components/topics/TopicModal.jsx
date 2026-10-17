import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { DateTime } from "luxon";
import { LoaderCircle, Plus, X } from "lucide-react";
import { Button } from "@/Components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/Components/ui/dialog";
import { Input } from "@/Components/ui/input";
import { Label } from "@/Components/ui/label";
import { Textarea } from "@/Components/ui/textarea";
import IconButton from "@/Components/common/IconButton";
import { useTopicCreate, useTopicUpdate } from "../../hooks/useTopicQuery";
import { useSubjectSuggestions } from "../../hooks/useSubjectSuggestions";

const FIELD_CLASS = "grid gap-2";

/**
 * Creates a topic, or edits `topic` when one is passed.
 * @param {{ setShowModal: (show: boolean) => void, topic?: object }} props
 */
export default function TopicModal({ setShowModal, topic }) {
  const isEdit = !!topic;

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: isEdit
      ? {
          topicName: topic.topicName,
          subjectName: topic.subjectName,
          description: topic.description || "",
          dateStudied: topic.dateStudied ? DateTime.fromISO(topic.dateStudied).toISODate() : "",
          urls: topic.urls?.length ? topic.urls.map((u) => ({ value: u.url || u })) : [{ value: "" }],
        }
      : {
          urls: [{ value: "" }],
        },
  });
  const { fields, append, remove } = useFieldArray({ name: "urls", control });

  const subjectInput = useWatch({ control, name: "subjectName" }) || "";
  const subjects = useSubjectSuggestions(subjectInput);

  const { isPending: isCreating, mutate: createTopic } = useTopicCreate();
  const { isPending: isUpdating, mutate: updateTopic } = useTopicUpdate();
  const isPending = isEdit ? isUpdating : isCreating;

  const maxDate = DateTime.now().toISODate();
  const minDate = DateTime.now().minus({ days: 5 }).toISODate();

  const onSubmit = async (formData) => {
    const urls = formData.urls.map((u) => u.value).filter(Boolean);
    if (urls.length) {
      formData.urls = urls;
    } else {
      delete formData.urls;
    }
    if (isEdit) {
      updateTopic({ id: topic._id, formData }, { onSettled: () => setShowModal(false) });
    } else {
      createTopic({ formData }, { onSettled: () => setShowModal(false) });
    }
  };

  const handleClose = () => {
    setShowModal(false);
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) handleClose();
      }}
    >
      <DialogContent aria-describedby={undefined} className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="m-0 text-headline-md">{isEdit ? "Edit Topic" : "New Topic"}</DialogTitle>
        </DialogHeader>
        {/* react-hook-form validates; the browser's date range check would block editing an older topic. */}
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <div className={FIELD_CLASS}>
            <Label htmlFor="topicName">Topic Name</Label>
            <Input id="topicName" type="text" className="h-9" placeholder="What did you learn today?" aria-invalid={errors.topicName ? true : undefined} {...register("topicName", { required: true })} autoComplete="off" />
          </div>
          <div className={FIELD_CLASS}>
            <Label htmlFor="subjectName">Subject</Label>
            <Input
              id="subjectName"
              type="text"
              className="h-9"
              placeholder="Which Subject?"
              aria-invalid={errors.subjectName ? true : undefined}
              {...register("subjectName", { required: true })}
              list="subjectSuggestions"
              autoComplete="off"
            />
            <datalist id="subjectSuggestions">
              {subjects.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>
          <div className={FIELD_CLASS}>
            <Label htmlFor="dateStudied">Date Learnt</Label>
            <Input className="h-9 font-mono" type="date" max={maxDate} min={minDate} defaultValue={maxDate} id="dateStudied" {...register("dateStudied")} />
          </div>
          <div className={FIELD_CLASS}>
            <Label htmlFor="description">Describe it</Label>
            <Textarea className="h-[100px] resize-none field-sizing-fixed" maxLength={200} id="description" placeholder="Describe it more?" {...register("description")} />
          </div>
          <div role="group" aria-labelledby="topicLinksLabel" className={FIELD_CLASS}>
            <span id="topicLinksLabel" className="text-sm leading-none font-medium">
              Links
            </span>
            {fields.map((field, index) => {
              const isLast = index === fields.length - 1;
              return (
                <div className="flex gap-2" key={field.id}>
                  <Input
                    type="text"
                    className="h-9 flex-1"
                    placeholder="Link"
                    aria-label="Link"
                    autoComplete="off"
                    aria-invalid={errors.urls?.[index]?.value ? true : undefined}
                    {...register(`urls.${index}.value`, { required: !isLast, pattern: !isLast ? /^https?:\/\/.+/ : undefined })}
                  />
                  {!isLast ? (
                    <IconButton type="button" label="Remove link" variant="outline" className="size-9" onClick={() => remove(index)}>
                      <X />
                    </IconButton>
                  ) : (
                    <IconButton type="button" label="Add link" variant="outline" className="size-9" onClick={() => append()}>
                      <Plus />
                    </IconButton>
                  )}
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <LoaderCircle data-icon="inline-start" aria-hidden="true" className="animate-spin" />
                  <span role="status">{isEdit ? "Saving..." : "Creating..."}</span>
                </>
              ) : isEdit ? (
                "Save"
              ) : (
                "Create"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
