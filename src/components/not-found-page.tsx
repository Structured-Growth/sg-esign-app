import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

type NotFoundPageProps = {
  title: string;
  description: string;
};

export function NotFoundPage({ title, description }: NotFoundPageProps) {
  return (
    <Box
      minHeight="100vh"
      display="flex"
      alignItems="center"
      justifyContent="center"
      bgcolor="#ffffff"
      px={3}
    >
      <Stack
        spacing={1.5}
        alignItems="center"
        textAlign="center"
        sx={{ width: "100%", maxWidth: 520 }}
      >
        <Typography
          component="h1"
          sx={{
            fontSize: { xs: 30, sm: 44 },
            lineHeight: 1.1,
            fontWeight: 700,
            color: "#111111",
          }}
        >
          {title}
        </Typography>
        <Typography
          sx={{
            fontSize: 12,
            lineHeight: 1.5,
            color: "rgba(17, 17, 17, 0.65)",
          }}
        >
          {description}
        </Typography>
      </Stack>
    </Box>
  );
}
