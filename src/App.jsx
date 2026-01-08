import React, { useEffect, useState, useRef } from 'react'
import { Box, Image, Text, Spinner, Center, VStack, HStack, Spacer, Progress, Link, Button, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton, useDisclosure, IconButton, Table, Thead, Tbody, Tr, Th, Td, TableContainer } from '@chakra-ui/react'

const PHOTOS_PER_HOUR = 6

const API_URL = 'https://unsplash-slideshow.onrender.com'

function App() {
  const [photos, setPhotos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [currentHour, setCurrentHour] = useState(-1)
  const lastFetchedHour = useRef(-1)
  const [clockOpacity, setClockOpacity] = useState(1)
  const [history, setHistory] = useState([])
  const clockTimeoutRef = useRef(null)
  const { isOpen: isMetadataOpen, onOpen: onMetadataOpen, onClose: onMetadataClose } = useDisclosure()
  const { isOpen: isHistoryOpen, onOpen: onHistoryOpen, onClose: onHistoryClose } = useDisclosure()

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
      const response = await fetch(API_URL + '/api/photos')
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
    fetchHistory()
  }, [])

  // Fetch history
  const fetchHistory = async () => {
    try {
      const response = await fetch(API_URL + '/api/history')
      if (response.ok) {
        const data = await response.json()
        setHistory(data.history || [])
      }
    } catch (err) {
      console.error('Error fetching history:', err)
    }
  }

  // Handle clock click to hide temporarily
  const handleClockClick = () => {
    // Clear any existing timeout
    if (clockTimeoutRef.current) {
      clearTimeout(clockTimeoutRef.current)
    }
    
    setClockOpacity(0)
    clockTimeoutRef.current = setTimeout(() => {
      // Slowly fade back in over 1 second
      setClockOpacity(1)
      clockTimeoutRef.current = null
    }, 5000)
  }

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (clockTimeoutRef.current) {
        clearTimeout(clockTimeoutRef.current)
      }
    }
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
        src={currentPhoto.urls.raw || currentPhoto.urls.full || currentPhoto.urls.regular}
        alt={currentPhoto.alt_description || currentPhoto.description || 'Unsplash photo'}
        w="100%"
        h="100%"
        objectFit="cover"
        transition="opacity 2s ease-in-out"
        draggable={false}
        loading="eager"
      />
      
      {/* Clock at the top */}
      <Center
        position="absolute"
        top="20px"
        left="50%"
        transform="translateX(-50%)"
        pointerEvents="auto"
        cursor="pointer"
        onClick={handleClockClick}
        opacity={clockOpacity}
        transition="opacity 1s ease-in-out"
      >
        <VStack spacing={2}>
          <Box
            bg="blackAlpha.200"
            color="white"
            px={8}
            py={2}
            borderRadius="99"
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
      
      {/* Control buttons in top right */}
      <HStack
        position="absolute"
        top="20px"
        right="20px"
        spacing={2}
        zIndex={10}
      >
        <IconButton
          aria-label="Show history"
          icon={<Text fontSize="lg">📜</Text>}
          onClick={() => {
            fetchHistory()
            onHistoryOpen()
          }}
          bg="blackAlpha.500"
          color="white"
          _hover={{ bg: "blackAlpha.700" }}
          size="md"
        />
        <Button
          onClick={onMetadataOpen}
          bg="blackAlpha.500"
          color="white"
          _hover={{ bg: "blackAlpha.700" }}
          size="md"
        >
          Metadata
        </Button>
      </HStack>

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

      {/* Metadata Modal */}
      <Modal isOpen={isMetadataOpen} onClose={onMetadataClose} size="md">
        <ModalOverlay />
        <ModalContent bg="gray.800" color="white">
          <ModalHeader>Photo Metadata</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <Box
              display="grid"
              gridTemplateColumns="repeat(auto-fit, minmax(140px, 1fr))"
              gap={3}
            >
              {currentPhoto.width && currentPhoto.height && (
                <Box
                  bg="gray.700"
                  p={3}
                  borderRadius="md"
                  border="1px solid"
                  borderColor="gray.600"
                >
                  <HStack spacing={2} align="center">
                    <Text fontSize="lg">📐</Text>
                    <VStack spacing={0} align="flex-start">
                      <Text fontSize="xs" opacity={0.7}>Size</Text>
                      <Text fontSize="sm" fontWeight="bold">
                        {currentPhoto.width} × {currentPhoto.height}
                      </Text>
                    </VStack>
                  </HStack>
                </Box>
              )}
              {currentPhoto.color && (
                <Box
                  bg="gray.700"
                  p={3}
                  borderRadius="md"
                  border="1px solid"
                  borderColor="gray.600"
                >
                  <HStack spacing={2} align="center">
                    <Box
                      w="24px"
                      h="24px"
                      bg={currentPhoto.color}
                      borderRadius="sm"
                      border="1px solid"
                      borderColor="gray.500"
                      flexShrink={0}
                    />
                    <VStack spacing={0} align="flex-start">
                      <Text fontSize="xs" opacity={0.7}>Color</Text>
                      <Text fontSize="xs" fontWeight="bold" noOfLines={1}>
                        {currentPhoto.color}
                      </Text>
                    </VStack>
                  </HStack>
                </Box>
              )}
              {currentPhoto.likes !== undefined && (
                <Box
                  bg="gray.700"
                  p={3}
                  borderRadius="md"
                  border="1px solid"
                  borderColor="gray.600"
                >
                  <HStack spacing={2} align="center">
                    <Text fontSize="lg">❤️</Text>
                    <VStack spacing={0} align="flex-start">
                      <Text fontSize="xs" opacity={0.7}>Likes</Text>
                      <Text fontSize="sm" fontWeight="bold">
                        {currentPhoto.likes.toLocaleString()}
                      </Text>
                    </VStack>
                  </HStack>
                </Box>
              )}
              {currentPhoto.downloads !== undefined && (
                <Box
                  bg="gray.700"
                  p={3}
                  borderRadius="md"
                  border="1px solid"
                  borderColor="gray.600"
                >
                  <HStack spacing={2} align="center">
                    <Text fontSize="lg">⬇️</Text>
                    <VStack spacing={0} align="flex-start">
                      <Text fontSize="xs" opacity={0.7}>Downloads</Text>
                      <Text fontSize="sm" fontWeight="bold">
                        {currentPhoto.downloads.toLocaleString()}
                      </Text>
                    </VStack>
                  </HStack>
                </Box>
              )}
              {currentPhoto.views !== undefined && (
                <Box
                  bg="gray.700"
                  p={3}
                  borderRadius="md"
                  border="1px solid"
                  borderColor="gray.600"
                >
                  <HStack spacing={2} align="center">
                    <Text fontSize="lg">👁️</Text>
                    <VStack spacing={0} align="flex-start">
                      <Text fontSize="xs" opacity={0.7}>Views</Text>
                      <Text fontSize="sm" fontWeight="bold">
                        {currentPhoto.views.toLocaleString()}
                      </Text>
                    </VStack>
                  </HStack>
                </Box>
              )}
              {currentPhoto.created_at && (
                <Box
                  bg="gray.700"
                  p={3}
                  borderRadius="md"
                  border="1px solid"
                  borderColor="gray.600"
                >
                  <HStack spacing={2} align="center">
                    <Text fontSize="lg">📅</Text>
                    <VStack spacing={0} align="flex-start">
                      <Text fontSize="xs" opacity={0.7}>Created</Text>
                      <Text fontSize="xs" fontWeight="bold" noOfLines={1}>
                        {new Date(currentPhoto.created_at).toLocaleDateString()}
                      </Text>
                    </VStack>
                  </HStack>
                </Box>
              )}
              {currentPhoto.exif && currentPhoto.exif.make && (
                <Box
                  bg="gray.700"
                  p={3}
                  borderRadius="md"
                  border="1px solid"
                  borderColor="gray.600"
                  gridColumn="span 2"
                >
                  <HStack spacing={2} align="center">
                    <Text fontSize="lg">📷</Text>
                    <VStack spacing={0} align="flex-start">
                      <Text fontSize="xs" opacity={0.7}>Camera</Text>
                      <Text fontSize="xs" fontWeight="bold">
                        {currentPhoto.exif.make} {currentPhoto.exif.model || ''}
                      </Text>
                    </VStack>
                  </HStack>
                </Box>
              )}
              {currentPhoto.exif && (currentPhoto.exif.exposure_time || currentPhoto.exif.aperture || currentPhoto.exif.iso) && (
                <Box
                  bg="gray.700"
                  p={3}
                  borderRadius="md"
                  border="1px solid"
                  borderColor="gray.600"
                  gridColumn="span 2"
                >
                  <HStack spacing={3} wrap="wrap">
                    {currentPhoto.exif.exposure_time && (
                      <Text fontSize="xs">
                        <Text as="span" opacity={0.7}>Exp:</Text> {currentPhoto.exif.exposure_time}s
                      </Text>
                    )}
                    {currentPhoto.exif.aperture && (
                      <Text fontSize="xs">
                        <Text as="span" opacity={0.7}>f/</Text>{currentPhoto.exif.aperture}
                      </Text>
                    )}
                    {currentPhoto.exif.iso && (
                      <Text fontSize="xs">
                        <Text as="span" opacity={0.7}>ISO:</Text> {currentPhoto.exif.iso}
                      </Text>
                    )}
                    {currentPhoto.exif.focal_length && (
                      <Text fontSize="xs">
                        <Text as="span" opacity={0.7}>{currentPhoto.exif.focal_length}mm</Text>
                      </Text>
                    )}
                  </HStack>
                </Box>
              )}
            </Box>
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* History Modal */}
      <Modal isOpen={isHistoryOpen} onClose={onHistoryClose} size="xl">
        <ModalOverlay />
        <ModalContent bg="gray.800" color="white" maxW="900px">
          <ModalHeader>Recent Photos History</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <TableContainer>
              <Table variant="simple" size="sm">
                <Thead>
                  <Tr>
                    <Th color="white" w="60px">#</Th>
                    <Th color="white" w="80px">Link</Th>
                    <Th color="white">Name</Th>
                    <Th color="white">Description</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {history.length === 0 ? (
                    <Tr>
                      <Td colSpan={4} textAlign="center">
                        <Text>No history available</Text>
                      </Td>
                    </Tr>
                  ) : (
                    [...history].reverse().map((item, index) => {
                      const displayIndex = history.length - index;
                      const truncatedDescription = item.description 
                        ? (item.description.length > 80 ? item.description.substring(0, 80) + '...' : item.description)
                        : 'No description';
                      return (
                        <Tr key={index}>
                          <Td>
                            <Text fontSize="xs" fontWeight="bold" opacity={0.6}>
                              #{displayIndex}
                            </Text>
                          </Td>
                          <Td>
                            <Link
                              href={item.link}
                              isExternal
                              color="yellow.100"
                              _hover={{ color: "yellow.200", textDecoration: "underline" }}
                              fontSize="xs"
                            >
                              🔗
                            </Link>
                          </Td>
                          <Td>
                            <Text
                              color="white"
                              fontSize="xs"
                              fontWeight="bold"
                              noOfLines={1}
                            >
                              {item.name || 'Untitled'}
                            </Text>
                          </Td>
                          <Td>
                            <Text fontSize="xs" noOfLines={1} opacity={0.8}>
                              {truncatedDescription}
                            </Text>
                          </Td>
                        </Tr>
                      );
                    })
                  )}
                </Tbody>
              </Table>
            </TableContainer>
          </ModalBody>
        </ModalContent>
      </Modal>

    </Box>
  )
}

export default App

