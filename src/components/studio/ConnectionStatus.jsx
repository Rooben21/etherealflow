import React from 'react';
import {RefreshCw} from 'lucide-react';
import useStudioConnections from '@/components/studio/useStudioConnections';
export default function ConnectionStatus({provider}){
 const {data,error,isFetching,refetch}=useStudioConnections();const state=data?.[provider];
 return <div className="mt-4 space-y-2"><div className="flex items-center justify-between gap-2"><span className={`text-xs ${state?.connected?'text-primary':'text-muted-foreground'}`}>{isFetching?'Перевірка…':state?.connected?'Підключено':state?'Немає з’єднання':'Ще не перевірено'}</span><button disabled={isFetching} onClick={()=>refetch()} className="studio-button" aria-label="Перевірити підключення"><RefreshCw size={13} className={isFetching?'animate-spin':''}/></button></div>{(state?.message||error)&&<p role="alert" className="text-xs text-destructive">{state?.message||error.message}</p>}{data?.checked_at&&<p className="text-[10px] text-muted-foreground">Остання перевірка: {new Date(data.checked_at).toLocaleString('uk-UA')}</p>}</div>;
}