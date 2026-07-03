import { useState } from 'react';
import { Platform, SafeAreaView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { fonts } from '../theme';
import { useFinanceData } from '../hooks/useFinanceData';
import { Header } from '../components/Header';
import { DashboardScreen } from './DashboardScreen';
import { HistoryScreen } from './HistoryScreen';
import { CategoriesScreen } from './CategoriesScreen';
import { ProfileScreen } from './ProfileScreen';
import { CapitalOnboardingModal } from './CapitalOnboardingModal';

const tabs = [{key:'dashboard',label:'Dashboard',icon:'grid-outline'},{key:'history',label:'History',icon:'time-outline'},{key:'categories',label:'Categories',icon:'shapes-outline'},{key:'profile',label:'Profile',icon:'person-outline'}] as const;
export type TabKey = typeof tabs[number]['key'];
export function AppShell(){const [tab,setTab]=useState<TabKey>('dashboard');const {palette}=useTheme();const data=useFinanceData();const {width}=useWindowDimensions();const wide=width>820;const page=tab==='dashboard'?<DashboardScreen {...data}/>:tab==='history'?<HistoryScreen {...data}/>:tab==='categories'?<CategoriesScreen {...data}/>:<ProfileScreen {...data}/>;
return <SafeAreaView style={[s.safe,{backgroundColor:palette.background}]}><View style={[s.shell,wide&&s.wide]}>{wide&&<Nav tab={tab} setTab={setTab} vertical/>}<View style={s.main}><Header avatarUrl={data.profile?.avatar_url}/>{data.error&&<Text style={[s.error,{backgroundColor:palette.dangerSoft,color:palette.danger}]}>{data.error}</Text>}{page}</View>{!wide&&<Nav tab={tab} setTab={setTab}/>}</View><CapitalOnboardingModal visible={!data.loading&&!data.error&&data.profile?.initial_capital==null} onSaved={data.refresh}/></SafeAreaView>}
function Nav({tab,setTab,vertical}:{tab:TabKey;setTab:(v:TabKey)=>void;vertical?:boolean}){const{palette}=useTheme();return <View style={[s.nav,{backgroundColor:palette.card,borderColor:palette.border},vertical&&s.navVertical]}>{tabs.map(x=>{const active=tab===x.key;return <Text key={x.key} onPress={()=>setTab(x.key)} style={[s.navItem,vertical&&s.navItemVertical,{color:active?palette.success:palette.muted,backgroundColor:active?palette.successSoft:'transparent'}]}><Ionicons name={x.icon} size={22}/> {x.label}</Text>})}</View>}
const s=StyleSheet.create({safe:{flex:1},shell:{flex:1},wide:{flexDirection:'row'},main:{flex:1},error:{fontFamily:fonts.regular,fontSize:13,padding:10,marginHorizontal:20,borderRadius:8},nav:{minHeight:76,borderTopWidth:1,flexDirection:'row',paddingHorizontal:10,paddingBottom:Platform.OS==='ios'?8:4,alignItems:'center',justifyContent:'space-around'},navVertical:{width:210,height:'100%',borderTopWidth:0,borderRightWidth:1,flexDirection:'column',justifyContent:'center',gap:10,padding:16},navItem:{fontFamily:fonts.mono,fontSize:12,paddingVertical:12,paddingHorizontal:10,borderRadius:30,overflow:'hidden'},navItemVertical:{width:'100%',fontSize:14,paddingHorizontal:18}});
