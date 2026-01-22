import React, { useState, useEffect } from "react";
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
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const STRAPI_HOST = "https://strapi.widelyapps.net";
const PRIMARY_COLOR = '#FFF9ED'; // 🎨 เปลี่ยนเป็นสีเดียวกับ LoginScreen

const TargetScreen = ({ route, navigation }) => {
  const { userId, userEmail, userName, token } = route.params;

  const [targets, setTargets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [newTargetSubject, setNewTargetSubject] = useState("");
  const [editingTarget, setEditingTarget] = useState(null);
  const [editTargetName, setEditTargetName] = useState("");

  useEffect(() => {
    fetchTargets();
    // ซ่อน navigation header
    navigation.setOptions({
      headerShown: false,
    });
  }, []);

  const fetchTargets = async () => {
    try {
      const url = `${STRAPI_HOST}/api/g04-targets?filters[useridd][$eq]=${userId}&sort=id:asc`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      console.log("Fetched targets:", data);
      
      if (response.ok) {
        const targetData = data.data || [];
        console.log("Setting targets:", targetData);
        // แปลงข้อมูลให้มี documentId ใน root level
        const transformedTargets = targetData.map(item => ({
          ...item,
          documentId: item.documentId,
          targetname: item.targetname,
          useridd: item.useridd
        }));
        setTargets(transformedTargets);
      } else {
        console.error("Failed to fetch targets:", data);
      }
    } catch (error) {
      console.error("Fetch error:", error);
      Alert.alert("ดึงข้อมูลล้มเหลว", error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchTargets();
  };

  const handleAddTarget = async () => {
    if (!newTargetSubject.trim()) {
      Alert.alert("กรอกข้อมูล", "กรุณากรอกชื่อวิชา");
      return;
    }

    try {
      const body = {
        data: {
          useridd: parseInt(userId),
          targetname: newTargetSubject.trim(),
        },
      };

      const response = await fetch(`${STRAPI_HOST}/api/g04-targets`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        setModalVisible(false);
        setNewTargetSubject("");
        fetchTargets();
        Alert.alert("สำเร็จ", "เพิ่มเป้าหมายเรียบร้อยแล้ว");
      } else {
        Alert.alert("เพิ่มไม่สำเร็จ");
      }
    } catch (err) {
      Alert.alert("เพิ่มล้มเหลว", err.message);
    }
  };

  const handleEditTarget = async () => {
    if (!editTargetName.trim()) {
      Alert.alert("กรอกข้อมูล", "กรุณากรอกชื่อวิชา");
      return;
    }

    try {
      const body = {
        data: {
          targetname: editTargetName.trim(),
        },
      };

      const response = await fetch(
        `${STRAPI_HOST}/api/g04-targets/${editingTarget.id}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        }
      );

      if (response.ok) {
        setEditModalVisible(false);
        setEditingTarget(null);
        setEditTargetName("");
        fetchTargets();
        Alert.alert("สำเร็จ", "แก้ไขข้อมูลเรียบร้อยแล้ว");
      } else {
        const errorData = await response.json();
        console.error("Edit failed:", errorData);
        Alert.alert("แก้ไขไม่สำเร็จ", "กรุณาลองใหม่อีกครั้ง");
      }
    } catch (err) {
      console.error("Edit error:", err);
      Alert.alert("แก้ไขล้มเหลว", err.message);
    }
  };

  const openEditModal = (item) => {
    const name = item.targetname || item?.attributes?.targetname || "";
    setEditingTarget(item);
    setEditTargetName(name);
    setEditModalVisible(true);
  };

  const handleDelete = async (id, documentId) => {
    console.log('🗑️ Delete function called for target ID:', id);
    console.log('🗑️ Document ID:', documentId);
    
    // ใช้ documentId เป็นหลัก ถ้าไม่มีใช้ id
    const deleteId = documentId || id;
    console.log('🗑️ Will delete using ID:', deleteId);
    
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('ยืนยันการลบ\n\nคุณต้องการลบ Target นี้หรือไม่?');
      console.log('✅ User confirmed:', confirmed);
      
      if (!confirmed) {
        console.log('❌ Delete cancelled by user');
        return;
      }

      try {
        console.log('🗑️ Starting delete process...');
        
        // ใช้ documentId ในการลบ
        const deleteUrl = `${STRAPI_HOST}/api/g04-targets/${deleteId}`;
        
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
          console.log('✅ Target deleted successfully from server');
          
          // ลบออกจาก state โดยใช้ id
          setTargets(prevTargets => {
            const newTargets = prevTargets.filter(t => t.id !== id);
            console.log('🔄 Updated state - remaining targets:', newTargets.map(t => t.id).join(', '));
            return newTargets;
          });
          
          window.alert('สำเร็จ\n\nลบ Target แล้ว');
          
          // Refresh เพื่อ sync กับ server
          console.log('🔄 Refreshing to verify deletion...');
          setTimeout(() => {
            fetchTargets();
          }, 500);
          console.log('✅ Refresh scheduled');
        } else {
          let errorData;
          try {
            errorData = await response.json();
          } catch (e) {
            errorData = await response.text();
          }
          console.error('❌ Delete failed:', errorData);
          window.alert(`เกิดข้อผิดพลาด\n\nไม่สามารถลบได้\n\nStatus: ${response.status}`);
        }
      } catch (error) {
        console.error('❌ Error deleting target:', error);
        window.alert(`เกิดข้อผิดพลาด\n\nไม่สามารถลบได้\n\nError: ${error.message}`);
      }
    } else {
      Alert.alert(
        'ยืนยันการลบ',
        'คุณต้องการลบ Target นี้หรือไม่?',
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
                const deleteUrl = `${STRAPI_HOST}/api/g04-targets/${deleteId}`;

                const response = await fetch(deleteUrl, {
                  method: 'DELETE',
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                  },
                });

                if (response.ok || response.status === 204) {
                  setTargets(prevTargets => prevTargets.filter(t => t.id !== id));
                  Alert.alert('สำเร็จ', 'ลบ Target แล้ว');
                  setTimeout(() => {
                    fetchTargets();
                  }, 500);
                } else {
                  let errorData;
                  try {
                    errorData = await response.json();
                  } catch (e) {
                    errorData = await response.text();
                  }
                  Alert.alert('เกิดข้อผิดพลาด', `Status: ${response.status}`);
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

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#EAA678" />
      </View>
    );
  }

  const renderItem = ({ item }) => {
    const name = item.targetname || item?.attributes?.targetname || "ไม่มีชื่อ";
    const documentId = item.documentId;
    
    console.log('📝 Rendering item:', {
      id: item.id,
      name: name,
      documentId: documentId,
      fullItem: item
    });

    return (
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.cardLeft}
          onPress={() =>
            navigation.navigate("StudyPlan", {
              targetId: item.id,
              targetName: name,
              userId,
              userEmail,
              userName,
              token,
            })
          }
        >
          <Text style={styles.cardTitle}>{name}</Text>
          <Text style={styles.detailText}>รายละเอียด</Text>
        </TouchableOpacity>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => openEditModal(item)}
          >
            <Ionicons name="create-outline" size={26} color="#4A90E2" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => {
              console.log('🔴 Delete button clicked!');
              console.log('🔴 Target ID to delete:', item.id);
              console.log('🔴 Document ID to delete:', documentId);
              handleDelete(item.id, documentId);
            }}
          >
            <Ionicons name="trash-outline" size={26} color="#D47C6A" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* BACK BUTTON - Orange rounded */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.backButtonText}>BACK</Text>
      </TouchableOpacity>

      {/* HEADER */}
      <Image 
        source={require('../assets/book.png')} 
        style={styles.bookImage}
        resizeMode="contain"
      />
      <Text style={styles.title}>TARGET</Text>
      <Text style={styles.subtitle}>เป้าหมายของ {userName || "คุณ"}</Text>

      {targets.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📭</Text>
          <Text style={styles.emptyTitle}>ไม่พบแผนการเรียน</Text>
          <Text style={styles.emptySubtitle}>
            ยังไม่มี Study Plans สำหรับ Target ID: {userId}
          </Text>
          
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setModalVisible(true)}
          >
            <Ionicons name="add-circle-outline" size={24} color="white" />
            <Text style={styles.addButtonText}>เพิ่มแผนการเรียน</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.refreshButton}
            onPress={onRefresh}
          >
            <Ionicons name="refresh" size={24} color="white" />
            <Text style={styles.refreshButtonText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={targets}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 120 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}

      {/* Floating ADD Button */}
      <TouchableOpacity
        style={styles.floatingButton}
        onPress={() => setModalVisible(true)}
      >
        <Ionicons name="add" size={40} color="white" />
      </TouchableOpacity>

      {/* ADD Modal */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>ADD NEW TARGET</Text>

            <TextInput
              style={styles.input}
              placeholder="ชื่อวิชา"
              value={newTargetSubject}
              onChangeText={setNewTargetSubject}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => {
                  setModalVisible(false);
                  setNewTargetSubject("");
                }}
              >
                <Text style={styles.cancelText}>CANCEL</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.addBtn}
                onPress={handleAddTarget}
              >
                <Text style={styles.addText}>ADD</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* EDIT Modal */}
      <Modal visible={editModalVisible} transparent animationType="fade">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>EDIT TARGET</Text>

            <TextInput
              style={styles.input}
              placeholder="ชื่อวิชา"
              value={editTargetName}
              onChangeText={setEditTargetName}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => {
                  setEditModalVisible(false);
                  setEditingTarget(null);
                  setEditTargetName("");
                }}
              >
                <Text style={styles.cancelText}>CANCEL</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.addBtn}
                onPress={handleEditTarget}
              >
                <Text style={styles.addText}>SAVE</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PRIMARY_COLOR, // 🎨 เปลี่ยนเป็น #FFF9ED เหมือน LoginScreen
    paddingTop: 50,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: PRIMARY_COLOR, // 🎨 เปลี่ยนเป็น #FFF9ED เหมือน LoginScreen
  },

  // Back Button (Orange rounded)
  backButton: {
    position: "absolute",
    top: 40,
    left: 20,
    backgroundColor: "#EAA678",
    paddingVertical: 6,
    paddingHorizontal: 20,
    borderRadius: 20,
    zIndex: 10,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  backButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "bold",
  },

  bookImage: {
    width: 120,
    height: 120,
    alignSelf: "center",
    marginTop: 20,
    marginBottom: 5,
  },

  title: {
    textAlign: "center",
    fontSize: 32,
    fontWeight: "bold",
    color: "#EAA678",
    marginTop: 0,
    marginBottom: 10,
  },

  subtitle: {
    textAlign: "center",
    fontSize: 18,
    fontWeight: "bold",
    color: "#888888",
    marginBottom: 30,
  },

  card: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    marginTop: 0,
    marginBottom: 18,
    padding: 20,
    borderRadius: 14,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 3,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  cardLeft: {
    flex: 1,
  },

  cardTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "black",
    marginBottom: 6,
  },

  detailText: {
    color: "#1D4ED8",
    fontSize: 15,
    fontWeight: "600",
  },

  actionButtons: {
    flexDirection: "row",
    gap: 10,
  },

  editBtn: {
    padding: 6,
  },

  deleteBtn: {
    padding: 6,
  },

  floatingButton: {
    position: "absolute",
    bottom: 40,
    right: 30,
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#E7A4C9",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 5,
  },

  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
  },

  modalBox: {
    width: "80%",
    backgroundColor: "white",
    padding: 25,
    borderRadius: 15,
  },

  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#D47C6A",
    textAlign: "center",
    marginBottom: 20,
  },

  input: {
    borderWidth: 2,
    borderColor: "#82A9FF",
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    marginBottom: 15,
    backgroundColor: "#F5F7FA",
  },

  modalBtnRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  cancelBtn: {
    flex: 1,
    backgroundColor: "#DDD",
    padding: 12,
    borderRadius: 10,
    marginRight: 10,
  },

  addBtn: {
    flex: 1,
    backgroundColor: "#D47C6A",
    padding: 12,
    borderRadius: 10,
  },

  cancelText: {
    textAlign: "center",
    color: "#444",
    fontWeight: "bold",
  },

  addText: {
    textAlign: "center",
    color: "white",
    fontWeight: "bold",
  },

  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    paddingTop: 50,
  },

  emptyIcon: {
    fontSize: 80,
    marginBottom: 20,
  },

  emptyTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
    textAlign: "center",
  },

  emptySubtitle: {
    fontSize: 16,
    color: "#888",
    textAlign: "center",
    marginBottom: 30,
  },

  addButton: {
    backgroundColor: "#EAA678",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },

  addButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 10,
  },

  refreshButton: {
    backgroundColor: "#9CA3AF",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },

  refreshButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 10,
  },
});

export default TargetScreen;