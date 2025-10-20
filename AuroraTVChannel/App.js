// App.js
// React Native (Expo) TV Channel App (Android)
// Updated for Aurora TV Channel (primary color #2196F3)
// Storage wrapper + sample channels included

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Platform,
  StatusBar,
  SafeAreaView,
  Linking,
} from 'react-native';
import { Video } from 'expo-av';

// ----------------------
// Storage wrapper
// ----------------------
let AsyncStorageModule = null;
try {
  AsyncStorageModule = require('@react-native-async-storage/async-storage');
} catch (e) {
  AsyncStorageModule = null;
}

const inMemoryStore = {};
const Storage = {
  async getItem(key) {
    try {
      if (AsyncStorageModule && AsyncStorageModule.getItem) {
        return await AsyncStorageModule.getItem(key);
      }
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
      return inMemoryStore[key] || null;
    } catch (e) {
      console.warn('Storage.getItem failed, using fallback', e);
      return inMemoryStore[key] || null;
    }
  },
  async setItem(key, value) {
    try {
      if (AsyncStorageModule && AsyncStorageModule.setItem) {
        return await AsyncStorageModule.setItem(key, value);
      }
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
        return;
      }
      inMemoryStore[key] = value;
    } catch (e) {
      console.warn('Storage.setItem failed, using fallback', e);
      inMemoryStore[key] = value;
    }
  },
  async removeItem(key) {
    try {
      if (AsyncStorageModule && AsyncStorageModule.removeItem) {
        return await AsyncStorageModule.removeItem(key);
      }
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
        return;
      }
      delete inMemoryStore[key];
    } catch (e) {
      console.warn('Storage.removeItem failed, using fallback', e);
      delete inMemoryStore[key];
    }
  },
};

const STORAGE_KEY = '@tv_favorites_v1';

const sampleChannels = [
  {
    id: 'c1',
    name: 'Aurora Live Demo (HLS)',
    url: 'https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8',
    logo: '',
    desc: 'Sample HLS stream (Sintel sample).',
  },
  {
    id: 'c2',
    name: 'Aurora Sample Movie (MP4)',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    logo: '',
    desc: 'MP4 demo stream.',
  },
  {
    id: 'c3',
    name: 'YouTube Example',
    url: 'https://www.youtube.com/watch?v=YE7VzlLtp-4',
    logo: '',
    desc: 'Opens in browser.',
  },
];

const PRIMARY_COLOR = '#2196F3';

export default function App() {
  const [channels, setChannels] = useState(sampleChannels);
  const [query, setQuery] = useState('');
  const [favorites, setFavorites] = useState({});
  const [playerVisible, setPlayerVisible] = useState(false);
  const [currentChannel, setCurrentChannel] = useState(null);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const videoRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [storageAvailable, setStorageAvailable] = useState(!!AsyncStorageModule || (typeof window !== 'undefined' && !!window.localStorage));

  useEffect(() => {
    loadFavorites();
  }, []);

  useEffect(() => {
    saveFavorites();
  }, [favorites]);

  const loadFavorites = async () => {
    try {
      const raw = await Storage.getItem(STORAGE_KEY);
      if (raw) {
        try {
          setFavorites(JSON.parse(raw));
        } catch (e) {
          console.warn('Failed to parse favorites JSON', e);
          setFavorites({});
        }
      }
    } catch (e) {
      console.warn('Failed to load favorites', e);
      setFavorites({});
    }
  };

  const saveFavorites = async () => {
    try {
      await Storage.setItem(STORAGE_KEY, JSON.stringify(favorites));
    } catch (e) {
      console.warn('Failed to save favorites', e);
    }
  };

  const toggleFavorite = (id) => {
    setFavorites((prev) => {
      const copy = { ...prev };
      if (copy[id]) delete copy[id];
      else copy[id] = true;
      return copy;
    });
  };

  const filtered = channels.filter((c) =>
    c.name.toLowerCase().includes(query.toLowerCase()) ||
    (c.desc || '').toLowerCase().includes(query.toLowerCase())
  );

  const openPlayer = (channel) => {
    if (channel.url.includes('youtube.com') || channel.url.includes('youtu.be')) {
      const url = channel.url;
      Linking.openURL(url).catch((e) => console.warn('Cannot open URL', e));
      return;
    }

    setCurrentChannel(channel);
    setPlayerVisible(true);
  };

  const addChannel = () => {
    if (!newName.trim() || !newUrl.trim()) {
      Alert.alert('Isi nama dan URL channel');
      return;
    }
    const id = 'c' + Date.now();
    const ch = { id, name: newName.trim(), url: newUrl.trim(), desc: '' };
    setChannels((s) => [ch, ...s]);
    setNewName('');
    setNewUrl('');
    setAddModalVisible(false);
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      onPress={() => openPlayer(item)}
      style={{
        padding: 12,
        borderBottomWidth: 1,
        borderColor: '#eee',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 16, fontWeight: '600' }}>{item.name}</Text>
        {item.desc ? <Text style={{ color: '#666' }}>{item.desc}</Text> : null}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity onPress={() => toggleFavorite(item.id)} style={{ marginRight: 12 }}>
          <Text>{favorites[item.id] ? '★' : '☆'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => openPlayer(item)}>
          <Text style={{ color: PRIMARY_COLOR }}>Play</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <StatusBar barStyle="dark-content" />
      <View style={{ padding: 12, borderBottomWidth: 1, borderColor: '#ddd' }}>
        <Text style={{ fontSize: 22, fontWeight: '700', color: PRIMARY_COLOR }}>Aurora TV Channel</Text>
        <Text style={{ color: '#666', marginTop: 6 }}>React Native (Expo) demo untuk memainkan channel HLS/MP4.</Text>
      </View>

      <View style={{ padding: 12 }}>
        <View style={{ flexDirection: 'row' }}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Cari channel..."
            style={{
              flex: 1,
              borderWidth: 1,
              borderColor: '#ddd',
              padding: 8,
              borderRadius: 8,
            }}
          />
          <TouchableOpacity
            onPress={() => setAddModalVisible(true)}
            style={{ padding: 10, backgroundColor: PRIMARY_COLOR, borderRadius: 8, justifyContent: 'center', marginLeft: 8 }}
          >
            <Text style={{ color: '#fff' }}>Tambah</Text>
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: 'row', marginTop: 10, alignItems: 'center' }}>
          <Text style={{ marginRight: 8, fontWeight: '600' }}>Favorit:</Text>
          <Text>{Object.keys(favorites).length} channel</Text>
        </View>

        {!storageAvailable ? (
          <Text style={{ color: '#a00', marginTop: 8 }}>Warning: Persistent storage unavailable — favorites will not persist between sessions.</Text>
        ) : null}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 120 }}
      />

      <Modal visible={addModalVisible} animationType="slide" transparent={true}>
        <View style={{ flex: 1, justifyContent: 'center', padding: 20, backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <View style={{ backgroundColor: '#fff', padding: 16, borderRadius: 8 }}>
            <Text style={{ fontWeight: '700', fontSize: 16 }}>Tambah Channel</Text>
            <TextInput
              placeholder="Nama channel"
              value={newName}
              onChangeText={setNewName}
              style={{ borderWidth: 1, borderColor: '#ddd', marginTop: 10, padding: 8, borderRadius: 6 }}
            />
            <TextInput
              placeholder="URL (m3u8 / mp4 / http(s) / youtube)"
              value={newUrl}
              onChangeText={setNewUrl}
              style={{ borderWidth: 1, borderColor: '#ddd', marginTop: 10, padding: 8, borderRadius: 6 }}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 }}>
              <TouchableOpacity onPress={() => setAddModalVisible(false)} style={{ marginRight: 12 }}>
                <Text>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={addChannel}>
                <Text style={{ color: PRIMARY_COLOR }}>Simpan</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={playerVisible} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
          <View style={{ flex: 1 }}>
            {currentChannel ? (
              <View style={{ flex: 1 }}>
                <Video
                  ref={videoRef}
                  source={{ uri: currentChannel.url }}
                  rate={1.0}
                  volume={1.0}
                  isMuted={false}
                  resizeMode="contain"
                  shouldPlay
                  useNativeControls
                  style={{ flex: 1, backgroundColor: '#000' }}
                />

                <View style={{ padding: 10, backgroundColor: '#111' }}>
                  <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>{currentChannel.name}</Text>
                  {currentChannel.desc ? <Text style={{ color: '#ccc' }}>{currentChannel.desc}</Text> : null}

                  <View style={{ flexDirection: 'row', marginTop: 8, justifyContent: 'space-between' }}>
                    <TouchableOpacity
                      onPress={() => {
                        toggleFavorite(currentChannel.id);
                      }}
                    >
                      <Text style={{ color: '#fff' }}>{favorites[currentChannel.id] ? '★ Favorit' : '☆ Tambah Favorit'}</Text>
                    </TouchableOpacity>

                    <View style={{ flexDirection: 'row' }}>
                      <TouchableOpacity
                        onPress={() => {
                          setIsFullscreen((f) => !f);
                          Alert.alert('Fullscreen', 'Gunakan tombol fullscreen pada player jika tersedia.');
                        }}
                        style={{ marginRight: 12 }}
                      >
                        <Text style={{ color: '#fff' }}>Toggle Fullscreen</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => {
                          setPlayerVisible(false);
                          setCurrentChannel(null);
                        }}
                      >
                        <Text style={{ color: '#fff' }}>Tutup</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                {/* Simple EPG placeholder */}
                <View style={{ padding: 10, backgroundColor: '#050505' }}>
                  <Text style={{ color: '#fff', fontWeight: '700' }}>Jadwal Siaran (EPG) - Contoh</Text>
                  <Text style={{ color: '#ccc', marginTop: 6 }}>08:00 - Morning Show</Text>
                  <Text style={{ color: '#ccc' }}>12:00 - News Update</Text>
                  <Text style={{ color: '#ccc' }}>18:00 - Prime Time Movie</Text>
                </View>
              </View>
            ) : null}
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}