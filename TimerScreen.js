import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, ImageBackground, Animated, AppState, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const PRIMARY_COLOR = '#F9F7F3';
const ACCENT_PINK = '#D69AC3';
const BUTTON_ORANGE = '#EAA88C';
const TEXT_BROWN = '#B86B4B';
const TEXT_PINK = '#C37BA7';

// แปลงเวลาเป็น MM:SS
const formatTime = (totalSeconds) => {
  if (typeof totalSeconds !== 'number' || isNaN(totalSeconds) || totalSeconds < 0) return "00:00";
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

const TimerScreen = ({ navigation, route }) => {
  const rawTotalTime = route?.params?.totalTime || 120;
  const totalTime = typeof rawTotalTime === 'string' ? parseInt(rawTotalTime, 10) : rawTotalTime;
  const { taskName, targetTitle } = route?.params || { taskName: 'Reading', targetTitle: 'Study' };

  const initialTotalSeconds = totalTime * 60;
  const [timeLeft, setTimeLeft] = useState(initialTotalSeconds);
  const [isTimerRunning, setIsTimerRunning] = useState(true);
  const [accurateFocusTime, setAccurateFocusTime] = useState(0);
  const [flowerStatus, setFlowerStatus] = useState('GROWING');
  const [showResult, setShowResult] = useState(false);

  const appState = useRef(AppState.currentState);
  const timerRef = useRef(null);

  // 🌼 Fade Animation สำหรับภาพดอกไม้
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // ฟังก์ชันเลือกภาพดอกไม้ตาม progress
  const getFlowerImage = () => {
    const progress = 1 - timeLeft / initialTotalSeconds;

    if (progress < 0.25)
      return { uri: 'https://snack-code-uploads.s3.us-west-1.amazonaws.com/~asset/443eff53057ae8a4fea2d18adc2a5347' };
    if (progress < 0.5)
      return { uri: 'https://snack-code-uploads.s3.us-west-1.amazonaws.com/~asset/20354a5fdabcf3c75fc370ab507a4bc8' };
    if (progress < 0.75)
      return { uri: 'https://snack-code-uploads.s3.us-west-1.amazonaws.com/~asset/20354a5fdabcf3c75fc370ab507a4bc8' };
    return { uri: 'https://snack-code-uploads.s3.us-west-1.amazonaws.com/~asset/d7c1ffd262fcbdfea0bdf6fa18675e42' };
  };

  // ทุกครั้งที่เวลาลดลง → ค่อย ๆ fade ภาพ
  useEffect(() => {
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  }, [timeLeft]);

  // ตัวจับเวลา
  useEffect(() => {
    if (initialTotalSeconds <= 0) {
      setFlowerStatus('FULL_BLOOM');
      setAccurateFocusTime(0);
      setShowResult(true);
      setIsTimerRunning(false);
      return;
    }

    if (isTimerRunning && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            setIsTimerRunning(false);
            setFlowerStatus('FULL_BLOOM');
            setAccurateFocusTime(initialTotalSeconds);
            setShowResult(true);
            return 0;
          }
          setAccurateFocusTime((p) => p + 1);
          return prev - 1;
        });
      }, 1000);
    } else if (!isTimerRunning && timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => clearInterval(timerRef.current);
  }, [isTimerRunning, timeLeft, initialTotalSeconds]);

  // ตรวจจับออกจากแอป (ให้ดอกไม้เหี่ยว)
  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      if (appState.current.match(/active/) && nextAppState.match(/inactive|background/)) {
        if (isTimerRunning) handleStopTimer(true);
      }
      appState.current = nextAppState;
    };

    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => sub.remove();
  }, [isTimerRunning]);

  // หยุดจับเวลา
  const handleStopTimer = (isWithered = false) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsTimerRunning(false);

    if (isWithered) {
      setFlowerStatus('WITHERED');
      Alert.alert('ออกจากหน้าจอ', `ดอกไม้เหี่ยวแล้ว 🥀\nเวลาโฟกัสจริง: ${formatTime(accurateFocusTime)}`);
    }

    setShowResult(true);
  };

  // ปุ่ม Back
  const handleBack = () => {
    if (isTimerRunning) handleStopTimer(true);
    else navigation.goBack();
  };

  // หน้าสรุปผล
  if (showResult) {
    return (
      <View style={styles.resultContainer}>
        <Text style={styles.resultTitle}>🌸 สรุปผลการโฟกัส 🌸</Text>
        <Text style={styles.resultText}>หัวข้อ: {targetTitle} - {taskName}</Text>
        <Text style={styles.resultText}>เป้าหมาย: {totalTime} นาที</Text>
        <Text style={styles.resultText}>เวลาโฟกัสจริง: {formatTime(accurateFocusTime)}</Text>
        <Text style={[styles.resultText, { fontSize: 26, marginTop: 10 }]}>
          สถานะดอกไม้: {flowerStatus === 'WITHERED' ? '🥀' : '🌷'}
        </Text>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: ACCENT_PINK }]}
          onPress={() => navigation.goBack()}>
          <Text style={styles.buttonText}>กลับสู่แผนการเรียน</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // หน้าจอจับเวลา
  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={handleBack}>
        <Text style={styles.backButtonText}>BACK</Text>
      </TouchableOpacity>

      <View style={styles.headerTag}>
        <Text style={styles.headerText}>{taskName.toUpperCase()}</Text>
      </View>

      <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>
      <Text style={styles.minsText}>MINS</Text>

      <ImageBackground
        source={{ uri: 'https://snack-code-uploads.s3.us-west-1.amazonaws.com/~asset/aff9184f532659bd11a2b31e56e5acf2' }}
        style={styles.bgImage}
        imageStyle={{ borderRadius: 20 }}
      >
        {/* 🌸 ภาพดอกไม้แบบ fade */}
        <Animated.Image
          source={getFlowerImage()}
          style={[styles.flowerImage, { opacity: fadeAnim }]}
          resizeMode="contain"
        />
      </ImageBackground>

      <Text style={styles.statusText}>
        {flowerStatus === 'WITHERED'
          ? '🥀 ดอกไม้เหี่ยวแล้ว'
          : flowerStatus === 'FULL_BLOOM'
          ? '🌷 ดอกไม้บานเต็มที่!'
          : '🌸 กำลังเติบโต...'}
      </Text>

      <TouchableOpacity style={styles.button} onPress={() => handleStopTimer(false)}>
        <Text style={styles.buttonText}>STOP</Text>
      </TouchableOpacity>
    </View>
  );
};

// 🎨 สไตล์
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PRIMARY_COLOR,
    alignItems: 'center',
    paddingTop: 100,
  },
  backButton: {
    position: 'absolute',
    top: 45,
    left: 25,
    backgroundColor: BUTTON_ORANGE,
    paddingVertical: 6,
    paddingHorizontal: 15,
    borderRadius: 20,
  },
  backButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  headerTag: {
    backgroundColor: TEXT_PINK,
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 25,
    marginBottom: 15,
  },
  headerText: {
    color: 'white',
    fontWeight: 'bold',
  },
  timerText: {
    fontSize: 64,
    fontWeight: 'bold',
    color: TEXT_BROWN,
  },
  minsText: {
    color: TEXT_BROWN,
    fontSize: 18,
    marginBottom: 10,
    fontWeight: 'bold',
  },
  bgImage: {
    width: width * 0.85,
    height: width * 0.85,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  flowerImage: {
    width: width * 0.55,
    height: width * 0.55,
  },
  statusText: {
    color: TEXT_PINK,
    fontSize: 16,
    marginBottom: 15,
  },
  button: {
    backgroundColor: TEXT_PINK,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 50,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
  },
  resultContainer: {
    flex: 1,
    backgroundColor: PRIMARY_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  resultTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: TEXT_PINK,
    marginBottom: 20,
  },
  resultText: {
    color: TEXT_BROWN,
    fontSize: 18,
    marginBottom: 10,
  },
});

export default TimerScreen;
