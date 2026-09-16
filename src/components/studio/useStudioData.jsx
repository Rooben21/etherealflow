import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import listStudioOperations from '@/components/studio/listStudioOperations';
export default function useStudioData() {
 const qc=useQueryClient();
 const videos=useQuery({queryKey:['studio-videos'],queryFn:()=>base44.entities.StudioVideo.list('-created_date',100)});
 const settings=useQuery({queryKey:['studio-settings'],queryFn:async()=>(await base44.entities.StudioSettings.list('created_date',1))[0]});
 const month=new Date().toISOString().slice(0,7)+'-01T00:00:00.000Z';
 const operations=useQuery({queryKey:['studio-operations',month],queryFn:()=>listStudioOperations(month)});
 const refresh=()=>Promise.all(['studio-videos','studio-settings','studio-operations','studio-video','studio-assets','studio-render','studio-publications'].map(key=>qc.invalidateQueries({queryKey:[key]})));
 return {videos:videos.data||[],settings:settings.data,operations:operations.data||[],loading:videos.isLoading||settings.isLoading||operations.isLoading,error:videos.error||settings.error||operations.error,refresh};
}