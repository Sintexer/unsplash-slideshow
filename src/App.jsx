import React, { useEffect, useState, useRef } from 'react'
import { Box, Image, Text, Spinner, Center, VStack, HStack, Spacer, Progress, Link } from '@chakra-ui/react'

const PHOTOS_PER_HOUR = 6

function App() {
  const [photos, setPhotos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [currentHour, setCurrentHour] = useState(-1)
  const lastFetchedHour = useRef(-1)

  // Calculate which photo to display based on current minute's decade
  const getPhotoIndex = () => {
    const minutes = currentTime.getMinutes()
    // 0-9 = 0, 10-19 = 1, 20-29 = 2, 30-39 = 3, 40-49 = 4, 50-59 = 5
    return Math.floor(minutes / 10)
  }

  const fetchPhotosForHour = async (hour) => {
    try {
      setError(null)
      setLoading(true)
      
      // Fetch 6 photos for the current hour
      const response = await fetch('/api/photos')
      if (!response.ok) {
        throw new Error('Failed to fetch photos')
      }
      
      const fetchedPhotos = await response.json()
      setPhotos(fetchedPhotos)
      setLoading(false)
      lastFetchedHour.current = hour
    } catch (err) {
      console.error('Error fetching photos:', err)
      setError(err.message)
      setLoading(false)
    }
  }

  // Update time every second
  useEffect(() => {
    const timeInterval = setInterval(() => {
      const now = new Date()
      setCurrentTime(now)
      
      // Check if hour has changed
      const currentHourValue = now.getHours()
      if (currentHourValue !== currentHour) {
        setCurrentHour(currentHourValue)
      }
    }, 1000)

    return () => clearInterval(timeInterval)
  }, [currentHour])

  // Fetch photos when hour changes
  useEffect(() => {
    if (currentHour !== -1 && currentHour !== lastFetchedHour.current) {
      fetchPhotosForHour(currentHour)
    }
  }, [currentHour])

  // Initial fetch
  useEffect(() => {
    const now = new Date()
    const hour = now.getHours()
    setCurrentHour(hour)
    fetchPhotosForHour(hour)
  }, [])

  // Calculate hour progress percentage
  const getHourProgress = () => {
    const minutes = currentTime.getMinutes()
    const seconds = currentTime.getSeconds()
    const totalSecondsInHour = 60 * 60
    const currentSecondsInHour = minutes * 60 + seconds
    return Math.round((currentSecondsInHour / totalSecondsInHour) * 100)
  }

  // Format time as HH:MM
  const formatTime = (date) => {
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    return `${hours}:${minutes}`
  }

  if (loading) {
    return (
      <Center h="100vh" bg="gray.900">
        <VStack spacing={4}>
          <Spinner size="xl" color="white" />
          <Text color="white">Loading photos...</Text>
        </VStack>
      </Center>
    )
  }

  if (error) {
    return (
      <Center h="100vh" bg="gray.900">
        <VStack spacing={4}>
          <Text color="red.400" fontSize="xl">
            Error: {error}
          </Text>
          <Text color="white" fontSize="sm">
            Make sure the server is running on http://localhost:5000
          </Text>
        </VStack>
      </Center>
    )
  }

  const photoIndex = getPhotoIndex()
  const currentPhoto = photos[photoIndex]

  if (!currentPhoto) {
    return (
      <Center h="100vh" bg="gray.900">
        <Text color="white">No photo available</Text>
      </Center>
    )
  }

  const hourProgress = getHourProgress()

  return (
    <Box
      w="100%"
      h="100vh"
      position="relative"
      overflow="hidden"
      bg="gray.900"
      cursor="pointer"
    >
      <Image
        src={currentPhoto.urls.regular || currentPhoto.urls.full}
        alt={currentPhoto.alt_description || currentPhoto.description || 'Unsplash photo'}
        w="100%"
        h="100%"
        objectFit="cover"
        transition="opacity 2s ease-in-out"
        draggable={false}
      />
      
      {/* Big clock in the center */}
      <Center
        position="absolute"
        top="50%"
        left="50%"
        transform="translate(-50%, -50%)"
        pointerEvents="none"
      >
        <VStack spacing={2}>
          <Box
            bg="blackAlpha.200"
            color="white"
            px={8}
            py={2}
            borderRadius="99  "
            backdropFilter="blur(10px)"
          >
            <Text fontSize="8xl" fontWeight="bold" fontFamily="mono">
              {formatTime(currentTime)}
            </Text>
          </Box>
          <Box w="100%" px={8}>
            <Progress
              value={hourProgress}
              size="xs"
              colorScheme="yellow"
              bgColor="blackAlpha.500"
              borderRadius="full"
              isAnimated
            />
          </Box>
        </VStack>   
      </Center>
      
      {/* Photo info overlay */}
      
        <Box
          position="absolute"
          bottom={0}
          left={0}
          right={0}
          bg="blackAlpha.500"
          color="white"
          paddingX={4}
          paddingY={2}
        >
      <HStack>
{currentPhoto.user && (
            <Box>
          <Text fontSize="sm" fontWeight="bold">
            Photo by{' '}
            <Link
              href={currentPhoto.user.links?.html || `https://unsplash.com/@${currentPhoto.user.username}`}
              isExternal
              color="yellow.100"
              _hover={{ color: "yellow.200", textDecoration: "underline" }}
              textDecoration="none"
            >
              {currentPhoto.user.name}
            </Link>
            {currentPhoto.user.instagram_username && (
              <Text as="span" fontSize="xs" ml={2} opacity={0.8}>
                (@{currentPhoto.user.instagram_username})
              </Text>
            )}
            {currentPhoto.links?.html && (
              <Text as="span" fontSize="xs" ml={2} opacity={0.6}>
                on{' '}
                <Link
                  href={currentPhoto.links.html}
                  isExternal
                  color="yellow.100"
                  _hover={{ color: "yellow.200", textDecoration: "underline" }}
                  textDecoration="none"
                  opacity={0.7}
                >
                  Unsplash
                </Link>
              </Text>
            )}
          </Text>
          {currentPhoto.description && (
            <Text fontSize="xs" mt={1} noOfLines={2}>
              {currentPhoto.description}
            </Text>
          )}
          </Box>

      )}
      <Spacer />
      <VStack spacing={1} align="flex-end">
          <HStack spacing={2}>
            <Text fontSize="sm" fontWeight="bold">
              Photo {photoIndex + 1} / {PHOTOS_PER_HOUR}
            </Text>
          </HStack>
          <Text fontSize="xs">
            {hourProgress}% of hour
          </Text>
        </VStack>
      </HStack>
        </Box>

    </Box>
  )
}

export default App

