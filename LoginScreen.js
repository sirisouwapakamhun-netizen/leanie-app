import React, { useState } from 'react';
import { 
 View, 
 Text, 
 TextInput, 
 TouchableOpacity, 
 StyleSheet, 
 Image,
 Alert,
 KeyboardAvoidingView,
 Platform,
 ScrollView,
 ActivityIndicator
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

const PRIMARY_COLOR = '#FFF9ED';
const BUTTON_COLOR = '#EAA678';
const TEXT_COLOR = '#5C5047';
const BORDER_COLOR = '#CFE5D3';
const STRAPI_HOST = "https://strapi.widelyapps.net";

const LoginScreen = () => {
 const navigation = useNavigation();
 
 const [identifier, setIdentifier] = useState('');
 const [password, setPassword] = useState('');
 const [loading, setLoading] = useState(false);
 const [showPassword, setShowPassword] = useState(false);

 // ฟังก์ชัน Login ด้วย Strapi Authentication API
 const handleSignIn = async () => {
  console.log('🔵 Sign In pressed');

  // ตรวจสอบข้อมูล
  if (!identifier.trim()) {
   Alert.alert('กรุณากรอกข้อมูล', 'กรุณากรอก Email หรือ Username');
   return;
  }

  if (!password.trim()) {
   Alert.alert('กรุณากรอกข้อมูล', 'กรุณากรอก Password');
   return;
  }

  setLoading(true);

  try {
   console.log('📤 Sending login request...');
   
   // ขั้นตอนที่ 1: Login ด้วย Strapi Auth
   const response = await fetch(`${STRAPI_HOST}/api/auth/local`, {
    method: 'POST',
    headers: {
     'Content-Type': 'application/json',
     'Accept': 'application/json',
    },
    body: JSON.stringify({
     identifier: identifier.trim(),
     password: password,
    }),
   });

   console.log('📥 Response status:', response.status);

   const data = await response.json();

   if (!response.ok) {
    const errorMessage = data?.error?.message || 'Login failed';
    console.error('❌ Login failed:', errorMessage);
    
    if (Platform.OS === 'web') {
     window.alert(
      errorMessage === 'Invalid identifier or password' 
       ? 'เข้าสู่ระบบไม่สำเร็จ\n\nEmail/Username หรือ Password ไม่ถูกต้อง'
       : `เข้าสู่ระบบไม่สำเร็จ\n\n${errorMessage}`
     );
    } else {
     Alert.alert(
      'เข้าสู่ระบบไม่สำเร็จ',
      errorMessage === 'Invalid identifier or password' 
       ? 'Email/Username หรือ Password ไม่ถูกต้อง'
       : errorMessage
     );
    }
    setLoading(false);
    return;
   }

   // Login สำเร็จ!
   console.log('✅ Login successful!');
   const strapiUser = data.user;
   const token = data.jwt;
   console.log('Strapi User ID:', strapiUser.id);
   console.log('Strapi User Email:', strapiUser.email);

   // ขั้นตอนที่ 2: หา g04-user โดยหาทั้ง email และ emailuser
   console.log('🔍 Searching for g04-user with email:', strapiUser.email);
   
   try {
    // ลองหาด้วย email ก่อน
    let g04Response = await fetch(
     `${STRAPI_HOST}/api/g04-users?filters[email][$eq]=${strapiUser.email}`,
     {
      headers: {
       'Authorization': `Bearer ${token}`,
      },
     }
    );

    console.log('📊 g04-user response (email) status:', g04Response.status);

    let g04Data = await g04Response.json();
    console.log('📊 g04-users found (email):', g04Data.data?.length || 0);

    // ถ้าไม่เจอ ลองหาด้วย emailuser
    if (!g04Data.data || g04Data.data.length === 0) {
     console.log('🔍 Trying with emailuser field...');
     g04Response = await fetch(
      `${STRAPI_HOST}/api/g04-users?filters[emailuser][$eq]=${strapiUser.email}`,
      {
       headers: {
        'Authorization': `Bearer ${token}`,
       },
      }
     );

     g04Data = await g04Response.json();
     console.log('📊 g04-users found (emailuser):', g04Data.data?.length || 0);
     
     // 🔍 Debug: ดู raw response
     if (g04Data.data && g04Data.data.length > 0) {
      console.log('🔍 RAW g04-user data:', JSON.stringify(g04Data.data, null, 2));
     }
    }

    // ถ้ายังไม่เจอ ลองหาด้วย strapi_user_id
    if (!g04Data.data || g04Data.data.length === 0) {
     console.log('🔍 Trying with strapi_user_id field...');
     g04Response = await fetch(
      `${STRAPI_HOST}/api/g04-users?filters[strapi_user_id][$eq]=${strapiUser.id}`,
      {
       headers: {
        'Authorization': `Bearer ${token}`,
       },
      }
     );

     g04Data = await g04Response.json();
     console.log('📊 g04-users found (strapi_user_id):', g04Data.data?.length || 0);
    }

    // ตรวจสอบว่าเจอ g04-user หรือไม่
    if (g04Data.data && g04Data.data.length > 0) {
     // เรียงตาม ID น้อยสุด (record เก่าสุด)
     const sortedUsers = g04Data.data.sort((a, b) => a.id - b.id);
     const g04User = sortedUsers[0];
     
     console.log('✅ Found g04-user(s):', g04Data.data.length);
     console.log('📋 All IDs:', g04Data.data.map(u => u.id).join(', '));
     console.log('✅ Using oldest g04-user ID:', g04User.id);
     console.log('g04-user loginid:', g04User.loginid);
     console.log('g04-user attributes:', JSON.stringify(g04User.attributes, null, 2));

     // ใช้ loginid ถ้ามี, ไม่งั้นใช้ id
     const actualUserId = g04User.loginid || g04User.id;
     console.log('🎯 Final userId (using loginid if available):', actualUserId);
     console.log('🚀 Navigating to Target screen...');

     // Navigate ไปหน้า Target ด้วย loginid หรือ id
     navigation.navigate('Target', { 
      userId: actualUserId, // ใช้ loginid ถ้ามี
      userEmail: strapiUser.email,
      userName: strapiUser.username,
      token: token
     });

     // เคลียร์ form
     setIdentifier('');
     setPassword('');

    } else {
     // ไม่เจอ g04-user ให้สร้างใหม่
     console.log('⚠️ g04-user not found, creating new one...');
     
     try {
      const createResponse = await fetch(`${STRAPI_HOST}/api/g04-users`, {
       method: 'POST',
       headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
       },
       body: JSON.stringify({
        data: {
         email: strapiUser.email,
         name: strapiUser.username,
         strapi_user_id: strapiUser.id,
        }
       }),
      });

      const newG04Data = await createResponse.json();
      console.log('📡 Create g04-user response status:', createResponse.status);

      if (createResponse.ok && newG04Data.data) {
       console.log('✅ g04-user created successfully!');
       console.log('New g04-user ID:', newG04Data.data.id);

       if (Platform.OS === 'web') {
        window.alert('เข้าสู่ระบบสำเร็จ!\n\n(สร้างโปรไฟล์ใหม่แล้ว)');
       } else {
        Alert.alert('เข้าสู่ระบบสำเร็จ!', '(สร้างโปรไฟล์ใหม่แล้ว)');
       }

       navigation.navigate('Target', { 
        userId: newG04Data.data.id,
        userEmail: strapiUser.email,
        userName: strapiUser.username,
        token: token
       });

       setIdentifier('');
       setPassword('');
      } else {
       // สร้าง g04-user ไม่สำเร็จ ใช้ Strapi user ID
       console.error('❌ Failed to create g04-user:', newG04Data);
       
       if (Platform.OS === 'web') {
        window.alert('เข้าสู่ระบบสำเร็จ!\n\n(ใช้ข้อมูลชั่วคราว)');
       } else {
        Alert.alert('เข้าสู่ระบบสำเร็จ!', '(ใช้ข้อมูลชั่วคราว)');
       }

       navigation.navigate('Target', { 
        userId: strapiUser.id,
        userEmail: strapiUser.email,
        userName: strapiUser.username,
        token: token
       });

       setIdentifier('');
       setPassword('');
      }
     } catch (createError) {
      console.error('❌ Error creating g04-user:', createError);
      
      if (Platform.OS === 'web') {
       window.alert('เข้าสู่ระบบสำเร็จ!\n\n(ใช้ข้อมูลชั่วคราว)');
      } else {
       Alert.alert('เข้าสู่ระบบสำเร็จ!', '(ใช้ข้อมูลชั่วคราว)');
      }

      navigation.navigate('Target', { 
       userId: strapiUser.id,
       userEmail: strapiUser.email,
       userName: strapiUser.username,
       token: token
      });

      setIdentifier('');
      setPassword('');
     }
    }
   } catch (g04Error) {
    console.error('❌ Network error fetching g04-user:', g04Error);
    
    if (Platform.OS === 'web') {
     window.alert('เข้าสู่ระบบสำเร็จ!\n\n(ใช้ข้อมูลชั่วคราว)');
    } else {
     Alert.alert('เข้าสู่ระบบสำเร็จ!', '(ใช้ข้อมูลชั่วคราว)');
    }

    navigation.navigate('Target', { 
     userId: strapiUser.id,
     userEmail: strapiUser.email,
     userName: strapiUser.username,
     token: token
    });

    setIdentifier('');
    setPassword('');
   }

  } catch (error) {
   console.error('❌ Network error:', error);
   if (Platform.OS === 'web') {
    window.alert(`เกิดข้อผิดพลาด\n\nไม่สามารถเชื่อมต่อกับ Server ได้\n\nError: ${error.message}\n\nกรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต`);
   } else {
    Alert.alert(
     'เกิดข้อผิดพลาด',
     `ไม่สามารถเชื่อมต่อกับ Server ได้\n\nError: ${error.message}\n\nกรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต`
    );
   }
  } finally {
   setLoading(false);
  }
 };

 return (
  <KeyboardAvoidingView 
   style={{ flex: 1 }} 
   behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  >
   <ScrollView 
    contentContainerStyle={styles.scrollContainer}
    keyboardShouldPersistTaps="handled"
   >
    <View style={styles.container}>
     {/* Logo */}
     <Image
      source={require('../assets/book.png')}
      style={styles.logo}
      resizeMode="contain"
     />
     
     {/* Title */}
     <Text style={styles.title}>LEARNIE</Text>
     <Text style={styles.subtitle}>ระบบติดตามความก้าวหน้า</Text>
     
     {/* Input Section */}
     <View style={styles.inputContainer}>
      <Text style={styles.label}>Email หรือ Username</Text>
      <TextInput
       style={styles.input}
       placeholder="your@email.com"
       keyboardType="email-address"
       autoCapitalize="none"
       autoCorrect={false}
       value={identifier}
       onChangeText={setIdentifier}
       editable={!loading}
      />

      <Text style={styles.label}>Password</Text>
      <View style={styles.passwordContainer}>
       <TextInput
        style={styles.passwordInput}
        placeholder="••••••••"
        secureTextEntry={!showPassword}
        value={password}
        onChangeText={setPassword}
        editable={!loading}
        returnKeyType="go"
        onSubmitEditing={handleSignIn}
       />
       <TouchableOpacity 
        style={styles.eyeButton}
        onPress={() => setShowPassword(!showPassword)}
       >
        <Text style={styles.eyeIcon}>
         {showPassword ? '👁️' : '👁️‍🗨️'}
        </Text>
       </TouchableOpacity>
      </View>
     </View>
     
     {/* Sign In Button */}
     <TouchableOpacity 
      style={[styles.primaryButton, loading && styles.buttonDisabled]} 
      onPress={handleSignIn}
      disabled={loading}
     >
      {loading ? (
       <View style={styles.loadingContainer}>
        <ActivityIndicator color="#FFFFFF" size="small" />
        <Text style={[styles.primaryButtonText, { marginLeft: 10 }]}>
         กำลังเข้าสู่ระบบ...
        </Text>
       </View>
      ) : (
       <Text style={styles.primaryButtonText}>เข้าสู่ระบบ</Text>
      )}
     </TouchableOpacity>

     {/* Info Box */}
     <View style={styles.infoBox}>
      <Text style={styles.infoTitle}>✅ ระบบทำงานอัตโนมัติ</Text>
      <Text style={styles.infoText}>
       <Text style={{ fontWeight: 'bold' }}>ขั้นตอนการทำงาน:{'\n'}</Text>
       1. Login ด้วย Email/Username{'\n'}
       2. ค้นหา g04-user ที่ตรงกับ email{'\n'}
       3. ถ้าไม่เจอจะสร้างใหม่อัตโนมัติ{'\n'}
       4. ใช้ g04-user ID ไปหน้า Target{'\n'}
       5. แสดง Targets ที่เกี่ยวข้อง{'\n'}
       {'\n'}
       <Text style={{ fontWeight: 'bold' }}>💡 ไม่ต้องกังวล!{'\n'}</Text>
       ระบบจะจัดการทุกอย่างอัตโนมัติ
      </Text>
     </View>

     {/* Register Link */}
     <Text style={styles.textBelow}>ยังไม่มีบัญชี?</Text>
     <TouchableOpacity
      style={styles.secondaryButton}
      onPress={() => navigation.navigate('Register')}
      disabled={loading}
     >
      <Text style={styles.secondaryButtonText}>สร้างบัญชีใหม่</Text>
     </TouchableOpacity>
    </View>
   </ScrollView>
  </KeyboardAvoidingView>
 );
};

const styles = StyleSheet.create({
 scrollContainer: {
  flexGrow: 1,
 },
 container: {
  flex: 1,
  backgroundColor: PRIMARY_COLOR,
  alignItems: 'center',
  justifyContent: 'flex-start',
  paddingTop: 60,
  paddingHorizontal: 20,
  paddingBottom: 30,
 },
 logo: {
  width: 100,
  height: 100,
  marginBottom: 10,
 },
 title: {
  fontSize: 36,
  fontWeight: 'bold',
  color: BUTTON_COLOR,
  marginBottom: 5,
 },
 subtitle: {
  fontSize: 14,
  color: TEXT_COLOR,
  marginBottom: 30,
 },
 inputContainer: {
  width: '100%',
  marginBottom: 20,
 },
 label: {
  fontSize: 16,
  fontWeight: 'bold',
  color: TEXT_COLOR,
  marginBottom: 8,
  marginTop: 5,
 },
 input: {
  height: 50,
  borderWidth: 2,
  borderColor: BORDER_COLOR,
  backgroundColor: '#FFFFFF',
  borderRadius: 8,
  paddingHorizontal: 15,
  fontSize: 16,
  marginBottom: 10,
 },
 passwordContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  height: 50,
  borderWidth: 2,
  borderColor: BORDER_COLOR,
  backgroundColor: '#FFFFFF',
  borderRadius: 8,
  marginBottom: 10,
 },
 passwordInput: {
  flex: 1,
  height: '100%',
  paddingHorizontal: 15,
  fontSize: 16,
 },
 eyeButton: {
  padding: 10,
  paddingRight: 15,
 },
 eyeIcon: {
  fontSize: 20,
 },
 primaryButton: {
  width: '100%',
  backgroundColor: BUTTON_COLOR,
  paddingVertical: 15,
  alignItems: 'center',
  borderRadius: 8,
  marginTop: 10,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
  elevation: 3,
 },
 primaryButtonText: {
  color: '#FFFFFF',
  fontSize: 18,
  fontWeight: 'bold',
 },
 buttonDisabled: {
  opacity: 0.6,
 },
 loadingContainer: {
  flexDirection: 'row',
  alignItems: 'center',
 },
 infoBox: {
  width: '100%',
  backgroundColor: '#DBEAFE',
  padding: 15,
  borderRadius: 8,
  marginTop: 25,
  marginBottom: 15,
  borderWidth: 1,
  borderColor: '#93C5FD',
 },
 infoTitle: {
  fontSize: 14,
  fontWeight: 'bold',
  color: TEXT_COLOR,
  marginBottom: 8,
 },
 infoText: {
  fontSize: 12,
  color: TEXT_COLOR,
  lineHeight: 18,
 },
 textBelow: {
  marginTop: 10,
  marginBottom: 10,
  color: TEXT_COLOR,
  fontSize: 14,
 },
 secondaryButton: {
  width: '100%',
  backgroundColor: 'transparent',
  paddingVertical: 14,
  alignItems: 'center',
  borderRadius: 8,
  borderWidth: 2,
  borderColor: BUTTON_COLOR,
 },
 secondaryButtonText: {
  color: BUTTON_COLOR,
  fontSize: 16,
  fontWeight: 'bold',
 },
});

export default LoginScreen;
