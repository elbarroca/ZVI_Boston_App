// app/(tabs)/listings/[id].tsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ScrollView, Text, ActivityIndicator, StyleSheet, View, Pressable, Alert, Share, Platform, Modal } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getListingBySlugOrId, saveListing, unsaveListing } from '@/lib/api';
import { useTheme } from '@/context/theme-provider';
import { themeColors } from '@/constants/theme';
import { useLanguage, TranslationKey } from '@/context/language-provider';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/config/supabase';
import { User } from '@supabase/supabase-js';
import ImageCarousel from '@/components/ImageCarousel';
import ImageGalleryModal from '@/components/ImageGalleryModal';
import TourConfirmationModal from '@/components/TourConfirmationModal';
import { Image } from 'expo-image';

type MediaItem = {
    url: string;
    type: 'image' | 'video' | 'virtualTour';
};

export default function ListingDetailScreen() {
	const params = useLocalSearchParams<{ id: string }>();
	const { id: slugOrId } = params;
	const { theme } = useTheme();
	const { t } = useLanguage();
	const colors = useMemo(() => themeColors[theme], [theme]);
	const [isSaved, setIsSaved] = useState(false);
	const [isSaveLoading, setIsSaveLoading] = useState(false);
	const [showTourModal, setShowTourModal] = useState(false);
	const [showImageModal, setShowImageModal] = useState(false);
	const [selectedImageIndex, setSelectedImageIndex] = useState(0);

	const queryClient = useQueryClient();

	const { data: listing, isLoading, error } = useQuery({
		queryKey: ['listing', slugOrId],
		queryFn: () => getListingBySlugOrId(slugOrId!),
		enabled: !!slugOrId,
	});

	const [user, setUser] = useState<User | null>(null);
	useEffect(() => {
		const getCurrentUser = async () => {
			const { data: { user } } = await supabase.auth.getUser();
			setUser(user);
		};
		getCurrentUser();
	}, []);

	const media = useMemo(() => {
		if (!listing?.image_urls) return [];
		return listing.image_urls.map((url: string) => ({ url, type: 'image' as const }));
	}, [listing?.image_urls]);

	useEffect(() => {
		const checkStatus = async () => {
			if (!user || !listing) return;
			const { data } = await supabase.from('saved_listings').select('id').eq('user_id', user.id).eq('listing_id', listing.id).single();
			setIsSaved(!!data);
		};
		checkStatus();
	}, [user, listing]);

	const handleToggleSave = async () => {
		if (!user || !listing) { Alert.alert(t('pleaseSignInToSaveListings')); return; }
		setIsSaveLoading(true);
		const currentlySaved = isSaved;
		setIsSaved(!currentlySaved);
		try {
			if (currentlySaved) {
				await unsaveListing(user.id, listing.id);
			} else {
				await saveListing(user.id, listing.id);
			}
			queryClient.invalidateQueries({ queryKey: ['saved-listings'] });
		} catch (err) {
			setIsSaved(currentlySaved);
			Alert.alert(t('error'), t('couldNotUpdateSavedStatus'));
		} finally {
			setIsSaveLoading(false);
		}
	};

	const handleRequestTour = () => {
		if (!user) { Alert.alert('Please sign in to request a tour'); return; }
		setShowTourModal(true);
	};

	const handleImagePress = (index: number) => {
		setSelectedImageIndex(index);
		setShowImageModal(true);
	};

	const handleShare = async () => {
		if (!listing) return;
		try {
			await Share.share({ message: `Check out this listing: ${listing.title}` });
		} catch (error) {
			Alert.alert(t('error'), 'Could not share listing.');
		}
	};

	const getAmenityText = (key: keyof typeof listing, trueText: TranslationKey, falseText?: TranslationKey): string | null => {
		const value = listing?.[key];
		if (typeof value === 'boolean') {
			return value ? t(trueText) : (falseText ? t(falseText) : null);
		}
		if (typeof value === 'string') {
			if (value === 'in-unit') return t('inUnitLaundry');
			if (value === 'on-site') return t('onSiteLaundry');
			if (value === 'none' && falseText) return t(falseText);
		}
		return null;
	};

	if (isLoading) return <ActivityIndicator size="large" style={styles.center} />;
	if (error || !listing) return <View style={styles.center}><Text style={styles.errorText}>{t('listingNotFound')}</Text></View>;

	return (
		<>
			<Stack.Screen options={{ title: '', headerTransparent: true, headerTintColor: colors.text }} />
			<View style={styles.mainContainer}>
				{/* ScrollView containing carousel and content */}
				<ScrollView
					style={styles.scrollView}
					contentContainerStyle={styles.scrollContent}
					showsVerticalScrollIndicator={false}
				>
					<ImageCarousel media={media} onImagePress={handleImagePress} />

					<View style={styles.content}>
						<Text style={[styles.title, { color: colors.text }]}>{listing.title}</Text>
						<Text style={[styles.address, { color: colors.textSecondary }]}>{listing.location_address}</Text>
						{listing.university_proximity_minutes && (
							<View style={styles.proximityChip}>
								<Ionicons name="school-outline" size={16} color={colors.success} />
								<Text style={[styles.proximityText, { color: colors.success }]}>{`${listing.university_proximity_minutes}-minute walk to ${listing.nearest_university}`}</Text>
							</View>
						)}
						<View style={styles.detailsGrid}>
							<DetailItem label={t('price')} value={`$${listing.price_per_month.toLocaleString()}/mo`} colors={colors} />
							<DetailItem label={t('beds')} value={listing.bedrooms.toString()} colors={colors} />
							<DetailItem label={t('baths')} value={listing.bathrooms.toString()} colors={colors} />
							<DetailItem label={t('lease')} value={`${listing.lease_duration_months} ${t('months')}`} colors={colors} />
						</View>
						<Separator color={colors.border} />
						<Text style={[styles.sectionTitle, { color: colors.text }]}>{t('aboutThisPlace')}</Text>
						<Text style={[styles.description, { color: colors.textSecondary }]}>{listing.description}</Text>
						<Separator color={colors.border} />
						<Text style={[styles.sectionTitle, { color: colors.text }]}>{t('whatThisPlaceOffers')}</Text>
						<View style={styles.amenitiesContainer}>
							<AmenityItem icon="shirt-outline" text={getAmenityText('laundry_type', 'inUnitLaundry', 'noLaundry')} colors={colors} />
							<AmenityItem icon="paw-outline" text={getAmenityText('pets_allowed', 'petsAllowed')} colors={colors} />
							<AmenityItem icon="bed-outline" text={getAmenityText('is_furnished', 'furnished')} colors={colors} />
						</View>
					</View>
				</ScrollView>

				{/* Footer - Outside ScrollView, always accessible */}
				<View style={[styles.footerContainer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
					<View style={styles.footer}>
						<Pressable style={[styles.requestButton, { backgroundColor: colors.primary }]} onPress={handleRequestTour}>
							<Text style={styles.requestButtonText}>🏠 Request a Tour</Text>
						</Pressable>
						<Pressable style={[styles.shareButton, { borderColor: colors.border }]} onPress={handleShare}>
							<Ionicons name="share-outline" size={24} color={colors.text} />
						</Pressable>
					</View>
				</View>

				{/* Save Button - Absolutely positioned over carousel */}
				<View style={styles.saveButtonContainer}>
					<Pressable onPress={handleToggleSave} disabled={isSaveLoading} style={styles.saveButton}>
						<Ionicons name={isSaved ? 'heart' : 'heart-outline'} size={28} color={'#FFFFFF'} />
					</Pressable>
				</View>
			</View>

			<TourConfirmationModal
				isVisible={showTourModal}
				onClose={() => setShowTourModal(false)}
				listingId={listing.id}
			/>

			<Modal visible={showImageModal} transparent={false} animationType="fade" onRequestClose={() => setShowImageModal(false)}>
				<ImageGalleryModal
					visible={showImageModal}
					media={media}
					initialIndex={selectedImageIndex}
					onClose={() => setShowImageModal(false)}
				/>
			</Modal>
		</>
	);
}



// Helper components (no changes needed)
const DetailItem = ({ label, value, colors }: any) => (<View style={styles.detailItem}><Text style={[styles.detailLabel, { color: colors.textMuted }]}>{label}</Text><Text style={[styles.detailValue, { color: colors.text }]}>{value}</Text></View>);
const AmenityItem = ({ icon, text, colors }: any) => { if (!text) return null; return (<View style={styles.amenityItem}><Ionicons name={icon} size={24} color={colors.textSecondary} /><Text style={[styles.amenityText, { color: colors.text }]}>{text}</Text></View>);};
const Separator = ({ color }: any) => <View style={[styles.separator, { backgroundColor: color }]} />;

const styles = StyleSheet.create({
	center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
	errorText: { fontSize: 18, fontWeight: '600', color: '#ef4444', textAlign: 'center' },
	mainContainer: { flex: 1 },
	scrollView: { flex: 1 },
	scrollContent: { paddingBottom: 100 }, // Space for footer
	saveButtonContainer: { position: 'absolute', top: Platform.OS === 'ios' ? 60 : 40, right: 20, zIndex: 10 },
	saveButton: { backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 20, padding: 8 },
	content: { padding: 20 },
	title: { fontSize: 26, fontWeight: 'bold' },
	address: { fontSize: 16, marginTop: 4 },
	proximityChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ecfdf5', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8, marginTop: 16, alignSelf: 'flex-start', gap: 6 },
	proximityText: { fontSize: 14, fontWeight: '500' },
	detailsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 20 },
	detailItem: { width: '48%', marginBottom: 16 },
	detailLabel: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
	detailValue: { fontSize: 18, fontWeight: '600' },
	separator: { height: 1, marginVertical: 24 },
	sectionTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
	description: { fontSize: 16, lineHeight: 24 },
	amenitiesContainer: { gap: 16 },
	amenityItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
	amenityText: { fontSize: 16 },
	footerContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopWidth: 1 },
	footer: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 20, paddingBottom: Platform.OS === 'ios' ? 34 : 20 },
	requestButton: { flex: 1, height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
	requestButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
	shareButton: { height: 52, width: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
	modalContainer: { flex: 1, backgroundColor: 'black', justifyContent: 'center', alignItems: 'center' },
	closeButton: { position: 'absolute', top: Platform.OS === 'ios' ? 60 : 40, right: 20, zIndex: 1 },
	fullScreenImage: { width: '100%', height: '100%' },
});