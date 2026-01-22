// DetailScreen.js
import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  Image,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
} from "react-native";
import StudyPlanScreen from './StudyPlanScreen';

const STRAPI_HOST = "https://strapi.widelyapps.net";
const TABLE_NAME = "g04-targets";
const API_URL = `${STRAPI_HOST}/api/${TABLE_NAME}`;
const TOKEN =
  "7e7e657feceb7e1b59c89fe8c48ac7326dbb6e7781568cd230544f98862b52ad5dc39b8914365842fadbdcf7dd0bfb60bbd61430b66465b556b8b14705cebdb61c65750fda65736beeef2437361a2beccd286315a2ae9e1fae507ef77eb56916ab19305000028278555ee8e7c98b3f646eb9816fdcf00ba10b2af3ac9715a282";

// Unwrap Strapi v4 shape if needed
const unwrap = (node) => (node?.attributes ? { id: node.id, ...node.attributes } : node);

export default function DetailScreen({ route }) {
  const baseItem = useMemo(() => unwrap(route.params?.data), [route.params]);
  const [item, setItem] = useState(baseItem);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  // Optional: refetch the latest detail by id
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const res = await fetch(
          `${API_URL}/${baseItem?.id}`,
          { headers: { Authorization: `Bearer ${TOKEN}` } }
        );
        const json = await res.json();
        const fetched = unwrap(json?.data) ?? baseItem;
        if (isMounted) setItem(fetched);
      } catch (e) {
        // Fall back to the passed item
        if (isMounted) setErr(e.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [baseItem?.id]);

  // Derive fields safely (works for both shapes)
  
  if (loading) return <ActivityIndicator style={{ flex: 1 }} />;
  if (!item) return <Text style={{ padding: 16 }}>Not found</Text>;

  return (
   <ScrollView contentContainerStyle={styles.container}>
    <View style={styles.content}>
      <Text style={styles.title}>{item?.targetname ?? "Untitled"}</Text>


      <StudyPlanScreen
        targetId={item?.id}
        subjectName={item?.targetname}
      />
    </View>
  </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingBottom: 24, backgroundColor: "#fff" },
  cover: { width: "100%", height: 260 },
  content: { padding: 16 },
  title: { fontSize: 20, fontWeight: "bold", marginBottom: 6 },
  meta: { color: "#555", marginTop: 2 },
  warn: { marginTop: 10, color: "#c77" },
});
