import { Modal, ModalBody, ModalFooter, ModalHeader, ModalTitle } from "react-bootstrap";
import { useFieldArray, useForm } from "react-hook-form";
import { useTopicCreate, useTopicUpdate } from "../../hooks/useTopicQuery";
import { DateTime } from "luxon";

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
          urls: topic.urls?.length ? topic.urls.map((u) => ({ value: u })) : [{ value: "" }],
        }
      : {
          urls: [{ value: "" }],
        },
  });
  const { fields, append, remove } = useFieldArray({ name: "urls", control });

  const { isPending: isCreating, mutate: createTopic } = useTopicCreate();
  const { isPending: isUpdating, mutate: updateTopic } = useTopicUpdate();
  const isPending = isEdit ? isUpdating : isCreating;

  const maxDate = DateTime.now().startOf("day").toJSDate();
  const minDate = DateTime.now().minus({ days: 5 }).startOf("day").toJSDate();

  const onSubmit = async (formData) => {
    formData.urls = formData.urls.map((u) => u.value);
    if (isEdit) {
      updateTopic(
        { id: topic._id, formData },
        { onSettled: () => setShowModal(false) },
      );
    } else {
      createTopic(
        { formData },
        { onSettled: () => setShowModal(false) },
      );
    }
  };

  const handleClose = () => {
    setShowModal(false);
  };

  return (
    <Modal show onHide={handleClose} centered>
      <ModalHeader closeButton>
        <ModalTitle>{isEdit ? "Edit Topic" : "Topic"}</ModalTitle>
      </ModalHeader>
      <ModalBody>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="form-floating mb-3">
            <input id="topicName" type="text" className={`form-control ${errors.topicName ? "is-invalid" : ""}`} placeholder="What did you learn today?" {...register("topicName", { required: true })} autoComplete="off" />
            <label htmlFor="topicName">Topic Name</label>
          </div>
          <div className="form-floating mb-3">
            <input id="subjectName" type="text" className={`form-control ${errors.subject ? "is-invalid" : ""}`} placeholder="Which Subject?" {...register("subjectName", { required: true })} list="datalistOptions" />
            <label htmlFor="subjectName">Subject</label>
            <datalist id="datalistOptions">
              <option value="San Francisco" />
              <option value="New York" />
              <option value="Seattle" />
              <option value="Los Angeles" />
              <option value="Chicago" />
            </datalist>
          </div>
          <div className="form-floating mb-3">
            <input className="form-control" type="date" max={maxDate} min={minDate} defaultValue={maxDate} id="dateStudied" {...register("dateStudied")} />
            <label htmlFor="dateStudied">Date Learnt</label>
          </div>
          <div className="form-floating mb-3">
            <textarea className="form-control" maxLength={200} style={{ height: "100px", resize: "none" }} type="text" id="description" placeholder="Describe it more?" {...register("description")} />
            <label htmlFor="description">Describe it</label>
          </div>
          <div className="mb-3">
            <label htmlFor="basic-url" className="form-label">
              Useful links
            </label>
            {fields.map((field, index) => {
              const isLast = index === fields.length - 1;
              return (
                <div className="input-group mb-3" key={field.id}>
                  <input type="text" className={`form-control ${errors.urls?.[index]?.value ? "is-invalid" : ""}`} placeholder="Link" aria-label="Link" {...register(`urls.${index}.value`, { required: !isLast, pattern: !isLast ? /^https?:\/\/.+/ : undefined })} />
                  {!isLast ? (
                    <button className="btn btn-outline-secondary d-flex align-items-center justify-content-center" type="button" id="add more" style={{ padding: "2px 5px", verticalAlign: "center" }} onClick={() => remove(index)}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" fill="currentColor" className="bi bi-x" viewBox="0 0 16 16">
                        <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708" />
                      </svg>
                    </button>
                  ) : (
                    <button className="btn btn-outline-secondary d-flex align-items-center justify-content-center" type="button" id="add more" style={{ padding: "2px 5px", verticalAlign: "center" }} onClick={() => append()}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" fill="currentColor" className="bi bi-plus" viewBox="0 0 16 16">
                        <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4" />
                      </svg>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </form>
      </ModalBody>
      <ModalFooter>
        <button className="btn btn-danger" onClick={handleClose}>
          Cancel
        </button>
        <button className="btn btn-success" onClick={handleSubmit(onSubmit)} disabled={isPending}>
          {isPending ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
              <span role="status">{isEdit ? "Saving..." : "Creating..."}</span>
            </>
          ) : (
            isEdit ? "Save" : "Create"
          )}
        </button>
      </ModalFooter>
    </Modal>
  );
}
