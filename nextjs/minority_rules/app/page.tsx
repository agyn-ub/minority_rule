'use client';
import { useFlowCurrentUser, Connect, useFlowQuery } from '@onflow/react-sdk';


export default function Home() {
  return (
    <div>
      <Connect />
    </div>
  );
}
