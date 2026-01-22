import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';

const { width } = Dimensions.get('window');

// 🎨 โทนสีให้เหมือนภาพ
const PRIMARY_COLOR = '#FFF9ED'; // พื้นหลังครีมอ่อน
const ACCENT_COLOR = '#E17248';  // สีข้อความ Register
const BORDER_COLOR = '#D9E3D5';  // สีขอบ input
const BUTTON_COLOR = '#E3985B';  // สีปุ่ม Register
const TEXT_COLOR = '#4A4A4A';
const STRAPI_HOST = "https://strapi.widelyapps.net";

const RegisterScreen = () => {
  const navigation = useNavigation();
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);

  // State สำหรับ form
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // 🔥 ซ่อน navigation header
  useEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, []);

  // ✅ กด Register แล้วเชื่อมต่อ Strapi
  const handleRegister = async () => {
    // Validation
    if (!name.trim()) {
      if (Platform.OS === 'web') {
        window.alert('กรุณากรอกข้อมูล\n\nกรุณากรอกชื่อ');
      } else {
        Alert.alert('กรุณากรอกข้อมูล', 'กรุณากรอกชื่อ');
      }
      return;
    }

    if (!email.trim()) {
      if (Platform.OS === 'web') {
        window.alert('กรุณากรอกข้อมูล\n\nกรุณากรอกอีเมล');
      } else {
        Alert.alert('กรุณากรอกข้อมูล', 'กรุณากรอกอีเมล');
      }
      return;
    }

    if (!password) {
      if (Platform.OS === 'web') {
        window.alert('กรุณากรอกข้อมูล\n\nกรุณากรอกรหัสผ่าน');
      } else {
        Alert.alert('กรุณากรอกข้อมูล', 'กรุณากรอกรหัสผ่าน');
      }
      return;
    }

    if (password !== confirmPassword) {
      if (Platform.OS === 'web') {
        window.alert('รหัสผ่านไม่ตรงกัน\n\nกรุณาตรวจสอบรหัสผ่านอีกครั้ง');
      } else {
        Alert.alert('รหัสผ่านไม่ตรงกัน', 'กรุณาตรวจสอบรหัสผ่านอีกครั้ง');
      }
      return;
    }

    if (password.length < 6) {
      if (Platform.OS === 'web') {
        window.alert('รหัสผ่านสั้นเกินไป\n\nรหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
      } else {
        Alert.alert('รหัสผ่านสั้นเกินไป', 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
      }
      return;
    }

    setLoading(true);

    try {
      console.log('📝 Registering user...');
      console.log('Name:', name);
      console.log('Email:', email);

      const response = await fetch(`${STRAPI_HOST}/api/auth/local/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: name.trim(),
          email: email.trim(),
          password: password,
        }),
      });

      const data = await response.json();
      console.log('📡 Response status:', response.status);
      console.log('📥 Response data:', JSON.stringify(data, null, 2));

      if (response.ok && data.jwt && data.user) {
        console.log('✅ Registration successful!');
        console.log('Strapi User ID:', data.user.id);
        console.log('Token:', data.jwt.substring(0, 20) + '...');

        // สร้าง g04-user หลังจาก register สำเร็จ
        try {
          console.log('📝 Creating g04-user...');
          
          const g04Response = await fetch(`${STRAPI_HOST}/api/g04-users`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${data.jwt}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              data: {
                email: data.user.email,
                name: data.user.username,
                strapi_user_id: data.user.id,
              }
            }),
          });

          const g04Data = await g04Response.json();
          console.log('📡 g04-user response status:', g04Response.status);

          if (g04Response.ok && g04Data.data) {
            console.log('✅ g04-user created successfully!');
            console.log('g04-user ID:', g04Data.data.id);

            if (Platform.OS === 'web') {
              window.alert('สมัครสำเร็จ!\n\nกำลังไปหน้า Target...');
            } else {
              Alert.alert('สมัครสำเร็จ!', 'กำลังไปหน้า Target...');
            }

            // ไปหน้า Target พร้อมส่ง g04-user ID
            navigation.navigate('Target', {
              userId: g04Data.data.id, // ใช้ g04-user ID แทน
              userEmail: data.user.email,
              userName: data.user.username,
              token: data.jwt,
            });
          } else {
            console.error('❌ Failed to create g04-user:', g04Data);
            
            // ถ้าสร้าง g04-user ไม่สำเร็จ ให้ใช้ Strapi user ID
            if (Platform.OS === 'web') {
              window.alert('สมัครสำเร็จ!\n\n(หมายเหตุ: กำลังใช้ข้อมูลชั่วคราว)');
            } else {
              Alert.alert('สมัครสำเร็จ!', '(หมายเหตุ: กำลังใช้ข้อมูลชั่วคราว)');
            }

            navigation.navigate('Target', {
              userId: data.user.id, // fallback ใช้ Strapi user ID
              userEmail: data.user.email,
              userName: data.user.username,
              token: data.jwt,
            });
          }
        } catch (g04Error) {
          console.error('❌ Error creating g04-user:', g04Error);
          
          // ถ้าเกิด error ให้ใช้ Strapi user ID
          if (Platform.OS === 'web') {
            window.alert('สมัครสำเร็จ!\n\n(หมายเหตุ: กำลังใช้ข้อมูลชั่วคราว)');
          } else {
            Alert.alert('สมัครสำเร็จ!', '(หมายเหตุ: กำลังใช้ข้อมูลชั่วคราว)');
          }

          navigation.navigate('Target', {
            userId: data.user.id, // fallback ใช้ Strapi user ID
            userEmail: data.user.email,
            userName: data.user.username,
            token: data.jwt,
          });
        }
      } else {
        // แสดง error จาก Strapi
        const errorMsg = data?.error?.message || JSON.stringify(data);
        console.error('❌ Registration failed:', errorMsg);

        if (Platform.OS === 'web') {
          window.alert(`ลงทะเบียนไม่สำเร็จ\n\n${errorMsg}`);
        } else {
          Alert.alert('ลงทะเบียนไม่สำเร็จ', errorMsg);
        }
      }
    } catch (error) {
      console.error('❌ Error during registration:', error);
      if (Platform.OS === 'web') {
        window.alert(`เกิดข้อผิดพลาด\n\n${error.message}`);
      } else {
        Alert.alert('เกิดข้อผิดพลาด', error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  // ✅ ฟังก์ชันเลือกรูปภาพ
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      if (Platform.OS === 'web') {
        window.alert('ต้องการสิทธิ์\n\nขออภัย เราต้องการสิทธิ์เข้าถึงคลังรูปภาพเพื่อตั้งค่ารูปภาพโปรไฟล์!');
      } else {
        alert('ขออภัย เราต้องการสิทธิ์เข้าถึงคลังรูปภาพเพื่อตั้งค่ารูปภาพโปรไฟล์!');
      }
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  return (
    <View style={styles.fullScreenContainer}>
      <ScrollView contentContainerStyle={styles.container}>
        
        {/* 🔙 ปุ่ม BACK */}
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
          disabled={loading}
        >
          <Text style={styles.backButtonText}>BACK</Text>
        </TouchableOpacity>

        {/* 🖼️ ส่วนหัว */}
        <View style={styles.header}>
          <Image
            source={require('../assets/book.png')}
            style={styles.headerImage}
            resizeMode="contain"
          />
          <Text style={styles.title}>REGISTER</Text>
        </View>

        {/* 📝 ช่องกรอกข้อมูล */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Name</Text>
          <TextInput 
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Enter your name"
            editable={!loading}
          />

          <Text style={styles.label}>E-mail</Text>
          <TextInput 
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="Enter your email"
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!loading}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput 
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Enter password (min 6 characters)"
            secureTextEntry
            editable={!loading}
          />

          <Text style={styles.label}>Confirm Password</Text>
          <TextInput 
            style={styles.input}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Confirm your password"
            secureTextEntry
            editable={!loading}
          />

          <Text style={styles.label}>Picture (Optional)</Text>
          <TouchableOpacity 
            style={styles.picturePicker} 
            onPress={pickImage}
            disabled={loading}
          >
            {image ? (
              <Image source={{ uri: image }} style={styles.previewImage} />
            ) : (
              <Text style={styles.addText}>+ Add Picture</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* 🔘 ปุ่ม REGISTER */}
        <TouchableOpacity 
          style={[styles.registerButton, loading && styles.registerButtonDisabled]} 
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.registerButtonText}>Register</Text>
          )}
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  fullScreenContainer: {
    flex: 1,
    backgroundColor: PRIMARY_COLOR,
  },
  container: {
    paddingHorizontal: 25,
    paddingTop: 50,
    alignItems: 'center',
    paddingBottom: 30,
  },
  backButton: {
    position: 'absolute',
    top: 40,
    left: 25,
    backgroundColor: BUTTON_COLOR,
    paddingVertical: 6,
    paddingHorizontal: 20,
    borderRadius: 20,
    zIndex: 10,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  headerImage: {
    width: 200,
    height: 200,
    marginBottom: 8,
  },
  title: {
    color: "#E8896C",
    fontWeight: 'bold',
    fontSize: 28,
    letterSpacing: 1,
  },
  inputContainer: {
    width: '100%',
    marginTop: 20,
  },
  label: {
    fontSize: 14,
    color: TEXT_COLOR,
    marginBottom: 5,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    height: 42,
    paddingHorizontal: 10,
  },
  picturePicker: {
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    height: 90,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 6,
  },
  addText: {
    color: '#A0A0A0',
    fontSize: 14,
  },
  registerButton: {
    marginTop: 30,
    backgroundColor: BUTTON_COLOR,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    width: '100%',
    elevation: 2,
  },
  registerButtonDisabled: {
    backgroundColor: '#CCC',
  },
  registerButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: 'bold',
  },
});

export default RegisterScreen;