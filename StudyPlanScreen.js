import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  StyleSheet, 
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const STRAPI_HOST = "https://strapi.widelyapps.net";

// Helper function สำหรับ Alert ที่รองรับทั้ง Web และ Mobile
const showAlert = async (title, message, buttons) => {
  console.log('🔔 showAlert called, Platform:', Platform.OS);
  if (Platform.OS === 'web') {
    console.log('🌐 Using window.confirm for web');
    if (buttons && buttons.length === 2) {
      const confirmed = window.confirm(`${title}\n\n${message}`);
      console.log('✅ User confirmed:', confirmed);
      if (confirmed && buttons[1].onPress) {
        console.log('▶️ Calling button[1].onPress (Delete action)');
        await buttons[1].onPress();
        console.log('✅ button[1].onPress completed');
      } else if (!confirmed && buttons[0].onPress) {
        console.log('▶️ Calling button[0].onPress (Cancel action)');
        await buttons[0].onPress();
      }
    } else {
      window.alert(`${title}\n\n${message}`);
    }
  } else {
    console.log('📱 Using Alert.alert for mobile');
    Alert.alert(title, message, buttons);
  }
};

const StudyPlanScreen = ({ route, navigation }) => {
  const { targetId, targetName, userId, userEmail, userName, token } = route.params;
  
  const [studyPlans, setStudyPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [newPlanData, setNewPlanData] = useState({
    subjectCode: '',
    description: '',
    timeMinutes: ''
  });

  useEffect(() => {
    console.log('📚 StudyPlan Screen Loaded');
    console.log('Target ID:', targetId);
    console.log('Target Name:', targetName);
    console.log('User ID:', userId);
    fetchStudyPlans();
  }, [targetId]);

  const fetchStudyPlans = async () => {
    try {
      const url = `${STRAPI_HOST}/api/g04-studyplans?filters[targetid][$eq]=${targetId}&sort[0]=id:asc`;
      console.log('🔍 Fetching study plans from:', url);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      const data = await response.json();
      console.log('📊 Response status:', response.status);
      console.log('📊 Full response data:', JSON.stringify(data, null, 2));
      console.log('📊 Study plans found:', data.data?.length || 0);
      
      if (response.ok) {
        const plans = data.data || [];
        console.log('📊 Plans before setState:', plans);
        setStudyPlans(plans);
        console.log('📊 Plans after setState - should update UI');
        
        if (plans.length === 0) {
          console.log('⚠️ No study plans found for targetId:', targetId);
        } else {
          console.log('✅ Study Plan IDs found:', plans.map(p => p.id).join(', '));
        }
      } else {
        throw new Error(data?.error?.message || 'Failed to fetch study plans');
      }
    } catch (error) {
      console.error('❌ Error fetching study plans:', error);
      showAlert(
        'เกิดข้อผิดพลาด',
        `ไม่สามารถดึงข้อมูล Study Plans ได้\n\nError: ${error.message}`
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchStudyPlans();
  };

  const handleStartTimer = (plan) => {
    console.log('⏱️ Starting timer for plan:', plan.id);
    
    const totalTime = plan.totaltime || plan.attributes?.totaltime || 60;
    const taskName = plan.topic || plan.attributes?.topic || 'Study';
    const subjectName = plan.subjectname || plan.attributes?.subjectname || targetName;
    
    navigation.navigate('Timer', {
      totalTime: totalTime,
      taskName: taskName,
      targetTitle: subjectName,
      planId: plan.id,
      targetId: targetId,
      userId: userId
    });
  };

  const handleDeletePlan = async (planId, documentId) => {
    console.log('🗑️ Delete function called for plan ID:', planId);
    console.log('🗑️ Document ID:', documentId);
    
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('ยืนยันการลบ\n\nคุณต้องการลบแผนการเรียนนี้หรือไม่?');
      console.log('✅ User confirmed:', confirmed);
      
      if (!confirmed) {
        console.log('❌ Delete cancelled by user');
        return;
      }

      try {
        console.log('🗑️ Starting delete process...');
        
        const unpublishUrl = `${STRAPI_HOST}/api/g04-studyplans/${planId}`;
        console.log('📝 Unpublishing first...');
        const unpublishResponse = await fetch(unpublishUrl, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            data: {
              publishedAt: null
            }
          }),
        });
        console.log('📝 Unpublish response:', unpublishResponse.status);
        
        const deleteUrl = documentId 
          ? `${STRAPI_HOST}/api/g04-studyplans/${documentId}`
          : `${STRAPI_HOST}/api/g04-studyplans/${planId}`;
        
        console.log('🗑️ Deleting from URL:', deleteUrl);
        
        const response = await fetch(deleteUrl, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        
        console.log('📡 Delete response status:', response.status);

        if (response.ok || response.status === 204) {
          console.log('✅ Plan deleted successfully');
          
          setStudyPlans(prevPlans => prevPlans.filter(p => p.id !== planId));
          
          window.alert('สำเร็จ\n\nลบแผนการเรียนแล้ว');

          console.log('🔄 Waiting 1 second before refresh...');
          await new Promise(resolve => setTimeout(resolve, 1000));
          console.log('🔄 Calling fetchStudyPlans to refresh...');
          await fetchStudyPlans();
          console.log('✅ fetchStudyPlans completed');
        } else {
          let errorData;
          try {
            errorData = await response.json();
          } catch (e) {
            errorData = await response.text();
          }
          console.error('❌ Delete failed:', errorData);
          window.alert(`เกิดข้อผิดพลาด\n\nไม่สามารถลบได้\n\nStatus: ${response.status}\nError: ${JSON.stringify(errorData)}`);
        }
      } catch (error) {
        console.error('❌ Error deleting plan:', error);
        window.alert(`เกิดข้อผิดพลาด\n\nไม่สามารถลบได้\n\nError: ${error.message}`);
      }
    } else {
      Alert.alert(
        'ยืนยันการลบ',
        'คุณต้องการลบแผนการเรียนนี้หรือไม่?',
        [
          {
            text: 'ยกเลิก',
            onPress: () => console.log('❌ Delete cancelled by user'),
            style: 'cancel'
          },
          {
            text: 'ลบ',
            onPress: async () => {
              try {
                console.log('🗑️ Starting delete process...');
                
                const response = await fetch(`${STRAPI_HOST}/api/g04-studyplans/${planId}`, {
                  method: 'DELETE',
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                  },
                });

                if (response.ok || response.status === 204) {
                  Alert.alert('สำเร็จ', 'ลบแผนการเรียนแล้ว');
                  fetchStudyPlans();
                } else {
                  let errorData;
                  try {
                    errorData = await response.json();
                  } catch (e) {
                    errorData = await response.text();
                  }
                  Alert.alert('เกิดข้อผิดพลาด', `Status: ${response.status}\nError: ${JSON.stringify(errorData)}`);
                }
              } catch (error) {
                Alert.alert('เกิดข้อผิดพลาด', error.message);
              }
            },
            style: 'destructive'
          }
        ]
      );
    }
  };

  const handleAddPlan = async () => {
    if (!newPlanData.subjectCode.trim()) {
      showAlert('กรุณากรอกข้อมูล', 'กรุณากรอก Subject Code');
      return;
    }

    if (!newPlanData.timeMinutes.trim() || isNaN(newPlanData.timeMinutes)) {
      showAlert('กรุณากรอกข้อมูล', 'กรุณากรอกเวลาเป็นตัวเลข');
      return;
    }

    try {
      console.log('➕ Adding new plan...');
      
      const today = new Date();
      const formattedDate = today.toISOString().split('T')[0];

      const planData = {
        data: {
          targetid: parseInt(targetId),
          subjectname: newPlanData.subjectCode.trim(),
          topic: (newPlanData.description || newPlanData.subjectCode).trim(),
          totaltime: parseInt(newPlanData.timeMinutes),
          accuratetime: 0,
          createdplan: formattedDate
        }
      };

      console.log('📤 Sending plan data:', JSON.stringify(planData, null, 2));

      const response = await fetch(`${STRAPI_HOST}/api/g04-studyplans`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(planData),
      });

      console.log('📡 Response status:', response.status);
      
      const responseData = await response.json();
      console.log('📥 Response data:', JSON.stringify(responseData, null, 2));

      if (response.ok) {
        console.log('✅ Plan added successfully');
        showAlert('สำเร็จ', 'เพิ่มแผนการเรียนแล้ว');
        
        setModalVisible(false);
        setNewPlanData({
          subjectCode: '',
          description: '',
          timeMinutes: ''
        });
        
        fetchStudyPlans();
      } else {
        console.error('❌ Failed to add plan:', responseData);
        const errorMsg = responseData?.error?.message || JSON.stringify(responseData);
        showAlert(
          'เกิดข้อผิดพลาด', 
          `ไม่สามารถเพิ่มแผนการเรียนได้\n\nStatus: ${response.status}\nError: ${errorMsg}`
        );
      }
    } catch (error) {
      console.error('❌ Error adding plan:', error);
      showAlert(
        'เกิดข้อผิดพลาด', 
        `ไม่สามารถเพิ่มแผนการเรียนได้\n\nError: ${error.message}`
      );
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#EAA678" />
        <Text style={styles.loadingText}>กำลังโหลดข้อมูล...</Text>
      </View>
    );
  }

  const renderStudyPlanItem = ({ item }) => {
    const topic = item.topic || item.attributes?.topic || 'ไม่มีหัวข้อ';
    const subjectName = item.subjectname || item.attributes?.subjectname || '-';
    const totalTime = item.totaltime || item.attributes?.totaltime || 0;
    const accurateTime = item.accuratetime || item.attributes?.accuratetime || 0;
    const createdPlan = item.createdplan || item.attributes?.createdplan || '-';

    return (
      <View style={styles.planCard}>
        <View style={styles.planHeader}>
          <Text style={styles.planTopic}>{topic}</Text>
          <TouchableOpacity 
            onPress={() => {
              console.log('🔴 Delete button clicked!');
              console.log('🔴 Plan ID to delete:', item.id);
              console.log('🔴 Document ID:', item.documentId);
              handleDeletePlan(item.id, item.documentId);
            }}
            style={styles.deleteButton}
          >
            <Ionicons name="trash-outline" size={24} color="#EF4444" />
          </TouchableOpacity>
        </View>

        <View style={styles.planDetails}>
          <Text style={styles.planDetail}>
            {subjectName} · total {totalTime} mins · accurate {accurateTime} mins
          </Text>
          <Text style={styles.planDate}>created: {createdPlan}</Text>
          <Text style={styles.planId}>{item.id}</Text>
        </View>

        <TouchableOpacity 
          style={styles.timerButton}
          onPress={() => handleStartTimer(item)}
        >
          <Ionicons name="timer-outline" size={20} color="#FFFFFF" />
          <Text style={styles.timerButtonText}>เริ่มจับเวลา ({totalTime} นาที)</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>

      {studyPlans.length === 0 ? (
        <View style={styles.emptyContainer}>
          <TouchableOpacity 
            style={styles.backButtonFloating}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#5C5047" />
          </TouchableOpacity>
          <Text style={styles.emptyIcon}>📭</Text>
          <Text style={styles.emptyTitle}>ไม่พบแผนการเรียน</Text>
          <Text style={styles.emptyText}>
            ยังไม่มี Study Plans สำหรับ Target ID: {targetId}
          </Text>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => setModalVisible(true)}
          >
            <Ionicons name="add-circle-outline" size={24} color="#FFFFFF" />
            <Text style={styles.addButtonText}>เพิ่มแผนการเรียน</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={onRefresh}
          >
            <Text style={styles.refreshButtonText}>🔄 Refresh</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <TouchableOpacity 
            style={styles.backButtonFloating}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#5C5047" />
          </TouchableOpacity>
          <FlatList
          data={studyPlans}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderStudyPlanItem}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#EAA678']}
            />
          }
        />
        </>
      )}

      {studyPlans.length > 0 && (
        <TouchableOpacity 
          style={styles.floatingButton}
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="add" size={32} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableOpacity 
            style={styles.modalBackground}
            activeOpacity={1}
            onPress={() => setModalVisible(false)}
          >
            <TouchableOpacity 
              activeOpacity={1}
              style={styles.modalContainer}
              onPress={(e) => e.stopPropagation()}
            >
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.modalTitle}>ADD NEW PLAN</Text>

                <TextInput
                  style={styles.input}
                  placeholder="Subject Code (e.g. BA111)"
                  placeholderTextColor="#999"
                  value={newPlanData.subjectCode}
                  onChangeText={(text) => setNewPlanData({...newPlanData, subjectCode: text})}
                />

                <TextInput
                  style={styles.input}
                  placeholder="Description"
                  placeholderTextColor="#999"
                  value={newPlanData.description}
                  onChangeText={(text) => setNewPlanData({...newPlanData, description: text})}
                />

                <TextInput
                  style={styles.input}
                  placeholder="Time (minutes)"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                  value={newPlanData.timeMinutes}
                  onChangeText={(text) => setNewPlanData({...newPlanData, timeMinutes: text})}
                />

                <View style={styles.modalButtons}>
                  <TouchableOpacity 
                    style={styles.cancelButton}
                    onPress={() => {
                      setModalVisible(false);
                      setNewPlanData({
                        subjectCode: '',
                        description: '',
                        timeMinutes: ''
                      });
                    }}
                  >
                    <Text style={styles.cancelButtonText}>CANCEL</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.addModalButton}
                    onPress={handleAddPlan}
                  >
                    <Text style={styles.addModalButtonText}>ADD</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF9ED',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF9ED',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#E8896C',
  },
  backButtonFloating: {
    position: 'absolute',
    top: 50,
    left: 15,
    zIndex: 10,
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  listContainer: {
    padding: 15,
  },
  planCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#CFE5D3',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  planTopic: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#5C5047',
    flex: 1,
  },
  deleteButton: {
    padding: 5,
  },
  planDetails: {
    marginBottom: 15,
  },
  planDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  planDate: {
    fontSize: 12,
    color: '#999',
    marginBottom: 3,
  },
  planId: {
    fontSize: 12,
    color: '#999',
  },
  timerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D69AC3',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  timerButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 15,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#5C5047',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 15,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EAA678',
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 15,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  refreshButton: {
    backgroundColor: '#9CA3AF',
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 8,
  },
  refreshButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  floatingButton: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#D69AC3',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackground: {
    flex: 1,
    width: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '85%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#EAA678',
    textAlign: 'center',
    marginBottom: 25,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#6B9CE8',
    borderRadius: 12,
    paddingVertical: 15,
    paddingHorizontal: 20,
    fontSize: 16,
    color: '#5C5047',
    marginBottom: 15,
  },
  modalButtons: {
    flexDirection: 'row',
    marginTop: 10,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#D1D5DB',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginRight: 15,
  },
  cancelButtonText: {
    color: '#5C5047',
    fontSize: 16,
    fontWeight: 'bold',
  },
  addModalButton: {
    flex: 1,
    backgroundColor: '#EAA678',
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  addModalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default StudyPlanScreen;