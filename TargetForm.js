// ContentList.js (TargetScreen.js)
import React, { useCallback, useEffect, useState } from "react";
import {
 View,
 Text,
 FlatList,
 Image,
 ActivityIndicator,
 TouchableOpacity,
 Button,
 StyleSheet,
 RefreshControl,
 Alert,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";

const STRAPI_HOST = "https://strapi.widelyapps.net";
const TABLE_NAME = "g04-targets";
const API_URL = `${STRAPI_HOST}/api/${TABLE_NAME}`;
const TOKEN = `7e7e657feceb7e1b59c89fe8c48ac7326dbb6e7781568cd230544f98862b52ad5dc39b8914365842fadbdcf7dd0bfb60bbd61430b66465b556b8b14705cebdb61c65750fda65736beeef2437361a2beccd286315a2ae9e1fae507ef77eb56916ab19305000028278555ee8e7c98b3f646eb9816fdcf00ba10b2af3ac9715a282`;

// ฟังก์ชันสำหรับ unwrap ข้อมูลจาก Strapi
const unwrap = (node) => (node?.attributes ? { id: node.id, ...node.attributes } : node);


const Card = ({ item, onView, onEdit, onDelete }) => {
 const pic = item?.picture?.formats?.medium?.url || item?.picture?.url || null;
 // 💡 ใช้ unwrap เพื่อเข้าถึง attributes และ id
 const data = unwrap(item); 
 
 return (
 <View style={styles.card}>
 <Text style={styles.cardTitle}>{data.targetname}</Text>
 <Text style={styles.cardSub}>Name: {data.name}</Text>
 <Text style={styles.cardSub}>User ID: {data.useridd}</Text> {/* 🆕 แสดง User ID ที่กรอง */}
 {pic ? (
 <Image
 source={{ uri: STRAPI_HOST + pic }}
 style={{ height: 160, borderRadius: 8, marginBottom: 8 }}
 />
 ) : null}

 <View style={styles.row}>
 <TouchableOpacity onPress={onView} style={styles.linkBtn}>
 <Text style={styles.cardLink}>ดูรายละเอียด</Text>
 </TouchableOpacity>

 <TouchableOpacity onPress={onEdit} style={styles.editBtn}>
 <Text style={styles.editText}>แก้ไข</Text>
 </TouchableOpacity>

 <TouchableOpacity onPress={onDelete} style={styles.deleteBtn}>
 <Text style={styles.deleteText}>ลบ</Text>
 </TouchableOpacity>
 </View>
 </View>
 );
};

// 🚨 แก้ไข: เพิ่ม { navigation, route } เพื่อรับ parameters
export default function ContentList({ navigation, route }) { 
 // 🆕 ดึง userId จาก route.params
 const userId = route.params?.userId; 

 const [data, setData] = useState(null);
 const [err, setErr] = useState(null);
 const [loading, setLoading] = useState(true);
 const [refreshing, setRefreshing] = useState(false);

 const load = useCallback(async () => {
 
 // 🆕 ตรวจสอบ User ID ก่อนเรียก API
 if (!userId) { 
 setErr("Error: Missing User ID. (กรุณา Sign In ใหม่อีกครั้ง)");
 setLoading(false);
 return;
 }
 
 try {
 setErr(null);
 
 // ✅ การกรองข้อมูลด้วย useridd
 const filterQuery = `filters[useridd][$eq]=${userId}`;
 const sortQuery = `&sort[0]=id:asc`;
 
 const url = `${API_URL}?${filterQuery}${sortQuery}`; // 🚨 URL ที่ถูกกรอง

 console.log("Fetching targets URL:", url); // 💡 ตรวจสอบ URL ที่ถูกใช้ในการกรอง

 const res = await fetch(url, {
 headers: { Authorization: `Bearer ${TOKEN}`, Accept: "application/json" },
 });
 const json = await res.json();
 if (!res.ok) {
 throw new Error(json?.error?.message || json?.message || `Load failed (${res.status})`);
 }
 setData(Array.isArray(json?.data) ? json.data : []);
 } catch (e) {
 setErr(e.message);
 } finally {
 setLoading(false);
 }
 }, [userId]); // 🚨 Dependency ต้องมี userId เพื่อให้โหลดใหม่เมื่อ userId เปลี่ยน

 useEffect(() => {
 load();
 }, [load]);

 useFocusEffect(
 useCallback(() => {
 // 🆕 ตรวจสอบ userId ก่อนเรียก load เมื่อหน้าจอ focus
 if (userId) load(); 
 }, [load, userId]) // 🚨 Dependency ต้องมี userId
 );

 const onRefresh = useCallback(async () => {
 setRefreshing(true);
 await load();
 setRefreshing(false);
 }, [load]);

 // 🔴 DELETE handler - ใช้ item.id ของ Strapi แทน documentId และ item.no
 const confirmDelete = useCallback(
 (item) => {
 // 💡 ใช้ item.id ที่ได้จาก Strapi
 const recordId = item?.id; 
 if (!recordId) {
 Alert.alert("Error", "Missing record id for this record.");
 return;
 }

 Alert.alert(
 "ยืนยันการลบ",
 `ต้องการลบรายการหมายเลข ${recordId} ?`, // 🆕 ใช้ recordId (Strapi ID) แทน item.no
 [
 { text: "ยกเลิก", style: "cancel" },
 {
 text: "ลบ",
 style: "destructive",
 onPress: async () => {
 try {
 const res = await fetch(`${API_URL}/${recordId}`, {
 method: "DELETE",
 headers: {
 Authorization: `Bearer ${TOKEN}`,
 Accept: "application/json",
 },
 });
 const text = await res.text();
 let json;
 try { json = text ? JSON.parse(text) : null; } catch { json = null; }

 if (!res.ok) {
 const msg =
 json?.error?.message || json?.message || text || `Delete failed (${res.status})`;
 throw new Error(msg);
 }

 // Optimistic update
 setData((prev) => (prev || []).filter((x) => x.id !== recordId)); // 🆕 กรองด้วย id
 Alert.alert("สำเร็จ", "ลบข้อมูลเรียบร้อยแล้ว");
 } catch (e) {
 Alert.alert("Error", e.message);
 }
 },
 },
 ]
 );
 },
 [setData]
 );

 if (err && !data) return <Text style={{ padding: 16, color: 'red' }}>{err}</Text>;
 if (loading && !data) return <ActivityIndicator style={{ flex: 1 }} />;

 return (
 <View style={styles.container}>
 <Text style={{color: 'red', textAlign: 'center'}}>{err}</Text> {/* 🆕 แสดง Error */}
 <View style={{ marginBottom: 12, marginTop: 12 }}>
 <Button
 title="➕ Add New Target"
 // 🚨 ส่ง userId ไปให้ TargetForm เพื่อบันทึก useridd
 onPress={() => navigation.navigate("TargetForm", { onSaved: load, userId: userId })}
 />
 </View>

 <FlatList
 data={data || []}
 keyExtractor={(item) => String(item.id)} // 🆕 ใช้ item.id ของ Strapi
 refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
 contentContainerStyle={{ paddingVertical: 8 }}
 renderItem={({ item }) => (
 <Card
 item={item}
 onView={() =>
 navigation.navigate("TargetDetail", {
 data: item,
 })
 }
 onEdit={() =>
 navigation.navigate("TargetForm", {
 data: item,
 onSaved: load,
 userId: userId, // 🚨 ส่ง userId ไปให้ TargetForm
 })
 }
 onDelete={() => confirmDelete(item)}
 />
 )}
 ListEmptyComponent={<Text style={{ padding: 16, color: "#555" }}>ไม่พบข้อมูลเป้าหมายสำหรับผู้ใช้คนนี้</Text>}
 />
 </View>
 );
}

const styles = StyleSheet.create({
 container: { flex: 1, paddingHorizontal: 12, backgroundColor: "#fff" },
 card: { padding: 12, borderRadius: 10, backgroundColor: "#f7f7f7", marginBottom: 12 },
 cardTitle: { fontWeight: "bold", fontSize: 16, marginBottom: 4 },
 cardSub: { color: "#555", marginBottom: 8 },
 cardLink: { color: "#1e88e5", fontWeight: "600" },
 editText: { color: "#43a047", fontWeight: "600" },
 deleteText: { color: "#e53935", fontWeight: "700" },
 row: { flexDirection: "row", justifyContent: "space-between", marginTop: 6, gap: 12 },
 linkBtn: { paddingVertical: 4 },
 editBtn: { paddingVertical: 4 },
 deleteBtn: { paddingVertical: 4 },
});