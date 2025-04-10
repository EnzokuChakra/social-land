"use client";

import { useEffect, useState } from "react";

function useMount() {
  const [mount, setMount] = useState(true);

  useEffect(() => {
    setMount(true);
  }, []);

  return mount;
}

export default useMount;
