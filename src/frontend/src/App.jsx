import {lazy, Suspense, useState} from 'react';
import {MotionConfig} from 'framer-motion';
import {WorkspaceProvider,WorkspaceApplication} from '@alpha03123/vsummary-workspace-ui';
import {createLocalHost} from './local-features/workspace/localHost';

const WorkspaceVideoScopeEmbed = lazy(() => import('./local-features/workspace/ui/WorkspaceVideoScopeEmbed'));
const MotionShowcase = lazy(() => import('./dev/MotionShowcase'));

function LazyFallback() {
  return <div className="flex h-dvh items-center justify-center text-sm text-subtle">正在加载...</div>;
}

export function App(){
 const [host]=useState(createLocalHost);
 const embedded=new URLSearchParams(window.location.search).get('embed')==='video-scope';
 const content = window.location.hash==='#test'
   ? <Suspense fallback={<LazyFallback />}><MotionShowcase /></Suspense>
   : embedded
     ? <Suspense fallback={<LazyFallback />}><WorkspaceVideoScopeEmbed /></Suspense>
     : <WorkspaceApplication />;
 return <MotionConfig reducedMotion="user"><WorkspaceProvider host={host}>{content}</WorkspaceProvider></MotionConfig>;
}
