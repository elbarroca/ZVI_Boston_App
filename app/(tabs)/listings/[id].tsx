// app/(tabs)/listings/[id].tsx
import { useState, useEffect, useMemo } from 'react';
import { ScrollView, Text, ActivityIndicator, StyleSheet, View, Pressable, Alert, Share, Platform, Modal, TextInput } from 'react-native';
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
import { Calendar } from 'react-native-calendars';
import TourConfirmationModal from '@/components/TourConfirmationModal';
import { TourService } from '@/lib/tourService';

export default function ListingDetailScreen() {
	const params = useLocalSearchParams<{ id: string }>();
	const { id: slugOrId } = params;
	const { theme } = useTheme();
	const { t } = useLanguage();
	const colors = useMemo(() => themeColors[theme], [theme]);
	const [isSaved, setIsSaved] = useState(false);
	const [isSaveLoading, setIsSaveLoading] = useState(false);
	const [isModalVisible, setIsModalVisible] = useState(false);
	const [hasExistingTourRequest, setHasExistingTourRequest] = useState(false);
	const [isCheckingTourRequest, setIsCheckingTourRequest] = useState(false);


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

	
	const imageUrls = useMemo(() => listing?.image_urls || [], [listing?.image_urls]);

	useEffect(() => {
		const checkStatus = async () => {
			if (!user || !listing) return;
			const { data } = await supabase.from('saved_listings').select('id').eq('user_id', user.id).eq('listing_id', listing.id).single();
			setIsSaved(!!data);
		};
		checkStatus();
	}, [user, listing]);

	useEffect(() => {
		const checkExistingTourRequest = async () => {
			if (!user || !listing) return;
			setIsCheckingTourRequest(true);
			try {
				const hasExistingRequest = await TourService.hasUserRequestedTourForListing(user.id, listing.id);
				setHasExistingTourRequest(hasExistingRequest);
			} catch (error) {
				console.error('Error checking existing tour request:', error);
			} finally {
				setIsCheckingTourRequest(false);
			}
		};
		checkExistingTourRequest();
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
		console.log('🎯 REQUEST TOUR BUTTON PRESSED');
		console.log('User exists:', !!user);
		console.log('Has existing tour request:', hasExistingTourRequest);
		console.log('Setting modal visible to:', true);

		if (!user) {
			Alert.alert(t('pleaseSignInToRequestTour'));
			return;
		}

		if (hasExistingTourRequest) {
			Alert.alert(t('tourRequestAlreadyExists') || 'You have already requested a tour for this listing. You can only request one tour per listing.');
			return;
		}

		setIsModalVisible(true);
	};

	// Time slots available
	const timeSlots = [
		"9:00 AM - 12:00 PM",
		"12:00 PM - 3:00 PM", 
		"3:00 PM - 6:00 PM",
		"6:00 PM - 9:00 PM"
	];

	// Reset form when modal opens
	useEffect(() => {
		if (isModalVisible) {
			// setSelectedDates({}); // Removed
			// setSelectedTimeSlots([]); // Removed
			// setPrioritySlots([]); // Removed
			// setPhoneNumber(''); // Removed
			// setMessage(''); // Removed
		}
	}, [isModalVisible]);

	// Get date range (today + 14 days)
	const getDateRange = () => {
		const today = new Date();
		const endDate = new Date();
		endDate.setDate(today.getDate() + 14);
		
		return {
			minDate: today.toISOString().split('T')[0],
			maxDate: endDate.toISOString().split('T')[0]
		};
	};

	// Handle calendar day press
	const handleDayPress = (day: any) => {
		const dateString = day.dateString;
		
		// setSelectedDates(prev => { // Removed
		// 	const newDates = { ...prev }; // Removed
		// 	if (newDates[dateString]?.selected) { // Removed
		// 		delete newDates[dateString]; // Removed
		// 	} else { // Removed
		// 		newDates[dateString] = { selected: true }; // Removed
		// 	} // Removed
		// 	return newDates; // Removed
		// }); // Removed
	};

	// Handle time slot selection with priority
	const handleTimeSlotPress = (timeSlot: string) => {
		// if (selectedTimeSlots.includes(timeSlot)) { // Removed
		// 	// Remove time slot // Removed
		// 	setSelectedTimeSlots(prev => prev.filter(slot => slot !== timeSlot)); // Removed
		// 	setPrioritySlots(prev => prev.filter(slot => slot.time !== timeSlot)); // Removed
		// } else { // Removed
			// Add time slot // Removed
			// setSelectedTimeSlots(prev => [...prev, timeSlot]); // Removed
			
			// Assign priority (1, 2, 3 based on selection order) // Removed
			// const nextPriority = selectedTimeSlots.length + 1; // Removed
			// if (nextPriority <= 3) { // Removed
			// 	setPrioritySlots(prev => [...prev, { time: timeSlot, priority: nextPriority }]); // Removed
			// } // Removed
		// } // Removed
	};

	// Get priority for a time slot
	const getTimePriority = (timeSlot: string): number | null => {
		// const slot = prioritySlots.find(s => s.time === timeSlot); // Removed
		// return slot ? slot.priority : null; // Removed
		return null; // Placeholder, as prioritySlots state is removed
	};

	const handleSubmitTourRequest = () => {
		// const selectedDatesArray = Object.keys(selectedDates).filter(date => selectedDates[date].selected); // Removed
		
		// if (selectedDatesArray.length === 0) { // Removed
		// 	Alert.alert("Missing Information", "Please select at least one date."); // Removed
		// 	return; // Removed
		// } // Removed
		
		// if (selectedTimeSlots.length === 0) { // Removed
		// 	Alert.alert("Missing Information", "Please select at least one time slot."); // Removed
		// 	return; // Removed
		// } // Removed

		// if (!phoneNumber.trim()) { // Removed
		// 	Alert.alert("Missing Information", "Please enter your phone number."); // Removed
		// 	return; // Removed
		// } // Removed

		// const tourData = { // Removed
		// 	selectedDates: selectedDatesArray, // Removed
		// 	selectedTimeSlots: prioritySlots, // Removed
		// 	phoneNumber: phoneNumber.trim(), // Removed
		// 	message: message.trim(), // Removed
		// }; // Removed

		// console.log('📋 Tour request submitted:', tourData); // Removed
		Alert.alert('Success!', 'Tour request submitted successfully!');
		setIsModalVisible(false);
		
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
        const value = listing[key];
        if (typeof value === 'boolean') {
            if (value) return t(trueText);
            return falseText ? t(falseText) : null;
        }
        if (value === 'in-unit') return t('inUnitLaundry');
        if (value === 'on-site') return t('onSiteLaundry');
        if (value === 'none' && falseText) return t(falseText);
        return null;
    };

	if (isLoading) return <ActivityIndicator size="large" style={styles.center} />;
	if (error || !listing) return <View style={styles.center}><Text style={styles.errorText}>{t('listingNotFound')}</Text></View>;

	return (
		<>
			<Stack.Screen options={{ title: '', headerTransparent: true, headerTintColor: colors.text }} />
			<ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.scrollContent}>
				<ImageCarousel imageUrls={imageUrls} />
				<Pressable onPress={handleToggleSave} disabled={isSaveLoading} style={styles.saveButton}>
					<Ionicons name={isSaved ? 'heart' : 'heart-outline'} size={28} color={'#FFFFFF'} />
				</Pressable>

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

			<View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.surface }]}>
				<Pressable
					style={[
						styles.requestButton,
						{
							backgroundColor: hasExistingTourRequest ? colors.textMuted : colors.primary,
							opacity: hasExistingTourRequest ? 0.6 : 1
						}
					]}
					onPress={handleRequestTour}
					disabled={hasExistingTourRequest}
				>
					<Text style={styles.requestButtonText}>
						{isCheckingTourRequest ? '⏳ Checking...' : hasExistingTourRequest ? '✅ Tour Requested' : `🏠 ${t('requestTour')}`}
					</Text>
				</Pressable>
				<Pressable style={[styles.shareButton, { borderColor: colors.border }]} onPress={handleShare}>
					<Ionicons name="share-outline" size={24} color={colors.text} />
				</Pressable>
			</View>

			<TourConfirmationModal
				isVisible={isModalVisible}
				onClose={() => {
					setIsModalVisible(false);
					// Refresh tour request status after modal closes (in case a request was submitted)
					if (user && listing) {
						setTimeout(() => {
							TourService.hasUserRequestedTourForListing(user.id, listing.id)
								.then(hasExistingRequest => {
									setHasExistingTourRequest(hasExistingRequest);
								})
								.catch(error => {
									console.error('Error refreshing tour request status:', error);
								});
						}, 1000); // Small delay to allow for database update
					}
				}}
				listingId={listing.id}
			/>
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
	container: { flex: 1 },
	scrollContent: { paddingBottom: 120 },
	saveButton: { position: 'absolute', top: Platform.OS === 'ios' ? 50 : 40, right: 20, zIndex: 10, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 20, padding: 8 },
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
	footer: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 20, borderTopWidth: 1, position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10 },
	requestButton: { flex: 1, height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
	requestButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
	shareButton: { height: 52, width: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },

});