import React, { useState, useEffect, useRef, useCallback } from "react";
import Lottie from "react-lottie-player";

export default function LottieAnimation({ id, icon, play }) {
  const lottieRef = useRef(null);
  // const [playForward, setPlayForward] = useState(false);
  // const handleOnComplete = useCallback(() => {
  //   const lottieInstance = lottieRef.current;
  //   if (playForward) {
  //     lottieInstance.setDirection(-1);
  //     lottieInstance.play();
  //     setPlayForward(false);
  //   } else {
  //     lottieInstance.stop();
  //   }
  // }, [playForward]);
  useEffect(() => {
    const lottieInstance = lottieRef.current;
    if (play) {
      lottieInstance.setDirection(1);
      lottieInstance.play();
    } else {
      lottieInstance.setDirection(-1);
      lottieInstance.play();
    }
  }, [play]);

  return (
    <div id={id} style={{marginBottom:"2px"}}>
      <Lottie ref={lottieRef} play={false} loop={false} animationData={icon} style={{ width: 25, height: 25 }} />
    </div>
  );
}
