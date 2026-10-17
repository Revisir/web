import DueQueue from "../Components/queue/DueQueue";

export default function TodayPage() {
  return (
    <>
      <h1 className="mb-4 text-headline-md text-foreground">Today's List</h1>
      <DueQueue />
    </>
  );
}
