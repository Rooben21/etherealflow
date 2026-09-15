import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Moon, ShieldCheck, ChevronRight } from 'lucide-react';
import StudioSidebar from '@/components/studio/StudioSidebar';
import '@/components/studio/studio.css';
const names={'/':'Дашборд','/library':'Бібліотека','/integrations':'Інтеграції','/accounts':'Акаунти','/studio':'Створення відео'};
export default function StudioLayout(){const {pathname}=useLocation();return <div><StudioSidebar/><div className="studio-main"><header className="studio-header"><div className="flex items-center gap-3 text-xs text-muted-foreground"><span className="hidden sm:inline">Робочий простір</span><ChevronRight size={13} className="hidden sm:block"/><span className="text-gray-200">{names[pathname]}</span></div><div className="flex items-center gap-5 text-muted-foreground"><span className="flex items-center gap-2 text-[10px]"><ShieldCheck size={13}/>Приватна студія</span><Moon size={16}/><span className="w-7 h-7 rounded-full border border-violet-300/20 bg-violet-400/10 grid place-items-center text-xs text-violet-200">Л</span></div></header><main className="studio-content"><Outlet/></main></div></div>}