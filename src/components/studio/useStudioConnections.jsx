import {useQuery} from '@tanstack/react-query';
import {base44} from '@/api/base44Client';
export default function useStudioConnections(){
 return useQuery({queryKey:['studio-connections'],queryFn:async()=>{const {data}=await base44.functions.invoke('studioConnections',{});if(data.error)throw new Error(data.error);return data;},staleTime:300000,retry:false,refetchOnWindowFocus:false});
}