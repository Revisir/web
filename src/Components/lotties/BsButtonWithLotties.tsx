import useHover from "../../hooks/useHover";
import { Button, type ButtonProps } from "react-bootstrap";
import LottieAnimation from "./LottiesAnimation";

type LottiesBtnProps = { id: string; icon: object } & ButtonProps;

export default function BsButtonWithLotties({ id, icon, ...props }: LottiesBtnProps) {
  const [btnRef, isHovering] = useHover();

  return (
    <Button ref={btnRef} {...props}>
      <LottieAnimation id={id} icon={icon} play={isHovering} />
    </Button>
  );
}
