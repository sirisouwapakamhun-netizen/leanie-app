import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// ✅ Import Components
import LoginScreen from './Screens/LoginScreen';
import RegisterScreen from './Screens/RegisterScreen';
import TargetListScreen from './Screens/TargetScreen'; // TargetScreen.js (ContentList)
import TargetDetailScreen from './Screens/TargetDetail'; // TargetDetail.js (DetailScreen)
import TargetFormScreen from './Screens/TargetForm'; // TargetForm.js (FormScreen)
import StudyPlanScreen from './Screens/StudyPlanScreen';
import TimerScreen from './Screens/TimerScreen';

const Stack = createNativeStackNavigator();

// 🎨 สีธีมหลัก
const PRIMARY_COLOR = '#F9F7F3'; 
const ACCENT_COLOR = '#C0A09A'; 

// 🎨 ธีมของ Navigation
const AppTheme = {
 ...DefaultTheme,
 colors: {
 ...DefaultTheme.colors,
 background: PRIMARY_COLOR,
 card: PRIMARY_COLOR,
 text: ACCENT_COLOR,
 border: 'transparent',
 },
};

export default function App() {
 return (
 <NavigationContainer theme={AppTheme}>
 <Stack.Navigator
 initialRouteName="Login"
 screenOptions={{
 headerShown: false,
 contentStyle: { backgroundColor: PRIMARY_COLOR },
 animation: 'slide_from_right',
 }}
 >
 {/* 🔐 Login & Register */}
 <Stack.Screen 
 name="Login" 
 component={LoginScreen}
 options={{ 
 headerShown: false,
 title: "เข้าสู่ระบบ" 
 }}
 />
 
 <Stack.Screen 
 name="Register" 
 component={RegisterScreen}
 options={{ 
 headerShown: true,
 title: "สมัครสมาชิก" 
 }}
 />

 {/* 🎯 Target Screens */}
 <Stack.Screen
 name="Target"
 component={TargetListScreen}
 options={({ route }) => ({
 headerShown: true,
 title: route.params?.userName 
 ? `เป้าหมายของ ${route.params.userName}` 
 : "เป้าหมาย",
 headerBackVisible: false, // ซ่อนปุ่มย้อนกลับ (ต้อง Logout ก่อน)
 })}
 />

 {/* 📝 Target Form (เพิ่ม/แก้ไข) */}
 <Stack.Screen 
 name="TargetForm" 
 component={TargetFormScreen}
 options={{ 
 headerShown: true, 
 title: "จัดการเป้าหมาย",
 presentation: 'modal', // เปิดแบบ modal (iOS)
 }}
 />

 {/* 📄 Target Detail (รายละเอียด) */}
 <Stack.Screen 
 name="TargetDetail" 
 component={TargetDetailScreen}
 options={{ 
 headerShown: true, 
 title: "รายละเอียดเป้าหมาย" 
 }}
 />

 {/* 📚 Study Plan & Timer */}
 <Stack.Screen 
 name="StudyPlan" 
 component={StudyPlanScreen}
 options={{ 
 headerShown: true, 
 title: "แผนการเรียน" 
 }}
 />
 
 <Stack.Screen 
 name="Timer" 
 component={TimerScreen}
 options={{ 
 headerShown: true, 
 title: "ตั้งเวลา" 
 }}
 />
 </Stack.Navigator>
 </NavigationContainer>
 );
}

