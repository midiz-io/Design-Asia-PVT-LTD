import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { FileSpreadsheet, FileText, Search, Loader2, ArrowLeft } from 'lucide-react';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { useJobs } from '@/hooks/useJobs';
import { format } from "date-fns";
import { useNavigate } from 'react-router-dom';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const AdminJobReport = () => {
  const navigate = useNavigate();
  const { jobs = [], isLoading } = useJobs();
  const [searchTerm, setSearchTerm] = useState('');
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportType, setExportType] = useState<'excel' | 'pdf' | null>(null);

  const formattedData = useMemo(() => {
    return jobs.map((job: any) => {
      const materialCost = (job.job_materials || []).reduce((sum: number, m: any) => sum + Number(m.amount || 0), 0);
      const laborCost = (job.job_labor || []).reduce((sum: number, m: any) => sum + Number(m.total_amount || 0), 0);
      const totalAmount = materialCost + laborCost;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      let calculatedStatus = job.status || 'Started';
      if (calculatedStatus !== 'Completed' && job.completion_date) {
        const completionDate = new Date(job.completion_date);
        if (completionDate < today) {
          calculatedStatus = 'Overdue';
        }
      }

      return {
        id: job.id,
        category: job.category || 'DA',
        date: job.created_at ? format(new Date(job.created_at), 'dd/MM/yyyy') : '-',
        jobNumber: job.job_number || '-',
        clientName: job.customer_name || '-',
        salesPerson: job.sales_person || '-',
        jobDescription: job.job_description || job.note || '-',
        jobStartedDay: job.start_date ? format(new Date(job.start_date), 'dd/MM/yyyy') : '-',
        jobCompletedDay: job.completion_date ? format(new Date(job.completion_date), 'dd/MM/yyyy') : '-',
        invoiceNo: job.invoice_no || "-",
        amount: job.invoice_amount ? `Rs. ${Number(job.invoice_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '-',
        quotationValue: job.quotation_value ? `Rs. ${Number(job.quotation_value).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '-',
        advance: job.advance ? `Rs. ${Number(job.advance).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "-",
        status: calculatedStatus,
        remarks: calculatedStatus
      };
    }).filter((item: any) => 
      item.jobNumber.toLowerCase().includes(searchTerm.toLowerCase()) || 
      item.jobDescription.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.clientName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [jobs, searchTerm]);

  const groupedData = useMemo(() => {
    return {
      DA: formattedData.filter((job: any) => job.category === 'DA'),
      TB: formattedData.filter((job: any) => job.category === 'TB'),
      AI: formattedData.filter((job: any) => job.category === 'AI'),
    };
  }, [formattedData]);

  const exportToExcel = async (category: string) => {
    try {
      const dataToExport = category === 'ALL' ? formattedData : groupedData[category as keyof typeof groupedData] || [];
      if (dataToExport.length === 0) return;

      const workbook = new ExcelJS.Workbook();
      const sheetName = category === 'ALL' ? 'Job Master Report' : `${category} Report`;
      const worksheet = workbook.addWorksheet(sheetName);

      // Title rows
      worksheet.addRow([`DESIGN ASIA GROUP - JOB MASTER REPORT${category !== 'ALL' ? ` (${category})` : ''}`]);
      worksheet.addRow([`Generated on: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`]);
      worksheet.addRow([]); // empty row

      // Style the title
      worksheet.mergeCells('A1:J1');
      const titleCell = worksheet.getCell('A1');
      titleCell.font = { size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      
      const dateCell = worksheet.getCell('A2');
      dateCell.font = { italic: true };
      
      // Define Headers
      const headerRow = worksheet.addRow([
        "Date", "Job Number", "Client Name", "Sales Person", "Job Description", 
        "Job Started Day", "Job Completed Day", "Quotation Value", "Invoice No.", "Invoice Amount", "Advance", "Status"
      ]);

      // Style headers
      headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
        cell.border = {
          top: { style: 'thin' }, left: { style: 'thin' },
          bottom: { style: 'thin' }, right: { style: 'thin' }
        };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      });

      // Add Data
      dataToExport.forEach((row: any) => {
        const dataRow = worksheet.addRow([
          row.date,
          row.jobNumber,
          row.clientName,
          row.salesPerson,
          row.jobDescription,
          row.jobStartedDay,
          row.jobCompletedDay,
          row.quotationValue,
          row.invoiceNo,
          row.amount,
          row.advance,
          row.status
        ]);
        
        dataRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
            left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
            bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
            right: { style: 'thin', color: { argb: 'FFCCCCCC' } }
          };
          cell.alignment = { vertical: 'middle', wrapText: true };
          if(colNumber === 7 || colNumber === 9 || colNumber === 10) {
             cell.alignment = { horizontal: 'right', vertical: 'middle' };
          }
        });
      });

      // Column Widths
      worksheet.columns = [
        { width: 15 }, // Date
        { width: 20 }, // Job Number
        { width: 25 }, // Client Name
        { width: 25 }, // Sales Person
        { width: 35 }, // Job Description
        { width: 18 }, // Started
        { width: 18 }, // Completed
        { width: 20 }, // Quotation Value
        { width: 18 }, // Invoice No
        { width: 20 }, // Invoice Amount
        { width: 18 }, // Advance
        { width: 15 }  // Status
      ];

      const buffer = await workbook.xlsx.writeBuffer();
      const fileName = category === 'ALL' ? "job_master_report.xlsx" : `job_master_report_${category}.xlsx`;
      saveAs(new Blob([buffer]), fileName);
    } catch (error) {
      console.error("Error generating excel:", error);
    }
  };

  const exportToPDF = (category: string) => {
    const dataToExport = category === 'ALL' ? formattedData : groupedData[category as keyof typeof groupedData] || [];
    if (dataToExport.length === 0) return;
    const doc = new jsPDF('landscape');
    
    doc.setFontSize(16);
    doc.text(`Job Master Report${category !== 'ALL' ? ` (${category})` : ''}`, 14, 15);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 22);

    autoTable(doc, {
      startY: 28,
      head: [["Date", "Job No", "Client Name", "Sales Person", "Job Description", "Started", "Completed", "Quotation", "Invoice No", "Inv. Amount", "Adv.", "Status"]],
      body: dataToExport.map((row: any) => [
        row.date,
        row.jobNumber,
        row.clientName,
        row.salesPerson,
        row.jobDescription,
        row.jobStartedDay,
        row.jobCompletedDay,
        row.quotationValue,
        row.invoiceNo,
        row.amount,
        row.advance,
        row.status
      ]),
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [15, 23, 42], textColor: 255 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });
    
    const fileName = category === 'ALL' ? "job_master_report.pdf" : `job_master_report_${category}.pdf`;
    doc.save(fileName);
  };

  const handleExport = (category: string) => {
    setExportDialogOpen(false);
    if (exportType === 'excel') {
      exportToExcel(category);
    } else if (exportType === 'pdf') {
      exportToPDF(category);
    }
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'Completed': return <Badge className="bg-emerald-500 hover:bg-emerald-600">Completed</Badge>;
      case 'In Progress': return <Badge className="bg-amber-500 hover:bg-amber-600">In Progress</Badge>;
      case 'Overdue': return <Badge variant="destructive">Overdue</Badge>;
      case 'Not Started': return <Badge variant="outline" className="text-slate-500 border-slate-300">Not Started</Badge>;
      default: return <Badge className="bg-blue-500 hover:bg-blue-600">{status}</Badge>;
    }
  };

  const renderTable = (data: any[]) => (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader className="bg-slate-100/80 sticky top-0">
          <TableRow className="hover:bg-transparent">
            <TableHead className="font-semibold text-slate-700">Date</TableHead>
            <TableHead className="font-semibold text-slate-700">Job Number</TableHead>
            <TableHead className="font-semibold text-slate-700">Client Name</TableHead>
            <TableHead className="font-semibold text-slate-700">Sales Person</TableHead>
            <TableHead className="font-semibold text-slate-700 min-w-[250px]">Job Description</TableHead>
            <TableHead className="font-semibold text-slate-700">Started</TableHead>
            <TableHead className="font-semibold text-slate-700">Completed</TableHead>
            <TableHead className="font-semibold text-slate-700 text-right">Quotation Value</TableHead>
            <TableHead className="font-semibold text-slate-700">Invoice No</TableHead>
            <TableHead className="font-semibold text-slate-700 text-right">Invoice Amount</TableHead>
            <TableHead className="font-semibold text-slate-700 text-right">Advance</TableHead>
            <TableHead className="font-semibold text-slate-700 text-center">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={12} className="h-64 text-center">
                <div className="flex flex-col items-center justify-center text-muted-foreground">
                  <Loader2 className="w-8 h-8 animate-spin mb-2 text-primary" />
                  <p>Fetching real-time data...</p>
                </div>
              </TableCell>
            </TableRow>
          ) : data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={12} className="h-32 text-center text-muted-foreground">
                No jobs found.
              </TableCell>
            </TableRow>
          ) : (
            data.map((row: any) => (
              <TableRow key={row.id} className="hover:bg-slate-50 transition-colors">
                <TableCell className="font-medium text-slate-600 whitespace-nowrap">{row.date}</TableCell>
                <TableCell className="font-bold text-primary whitespace-nowrap">{row.jobNumber}</TableCell>
                <TableCell className="whitespace-nowrap">{row.clientName}</TableCell>
                <TableCell className="whitespace-nowrap">{row.salesPerson}</TableCell>
                <TableCell className="whitespace-pre-wrap text-sm text-slate-600">{row.jobDescription}</TableCell>
                <TableCell className="whitespace-nowrap text-slate-600">{row.jobStartedDay}</TableCell>
                <TableCell className="whitespace-nowrap text-slate-600">{row.jobCompletedDay}</TableCell>
                <TableCell className="whitespace-nowrap font-medium text-right">{row.quotationValue}</TableCell>
                <TableCell className="whitespace-nowrap text-slate-400 italic">{row.invoiceNo}</TableCell>
                <TableCell className="whitespace-nowrap font-medium text-right">{row.amount}</TableCell>
                <TableCell className="whitespace-nowrap font-medium text-right">{row.advance}</TableCell>
                <TableCell className="text-center">{renderStatusBadge(row.status)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/50 backdrop-blur-sm p-6 rounded-xl border border-border/50 shadow-sm">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full mr-1 hover:bg-slate-200/50">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">Job Master Report</h1>
            <p className="text-muted-foreground mt-1">
              Real-time analysis and export of all job records.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => { setExportType('excel'); setExportDialogOpen(true); }} variant="outline" className="gap-2 shadow-sm hover:shadow transition-all" disabled={isLoading || formattedData.length === 0}>
            <FileSpreadsheet className="w-4 h-4 text-green-600" />
            <span className="hidden sm:inline">Export Excel</span>
            <span className="sm:hidden">Excel</span>
          </Button>
          <Button onClick={() => { setExportType('pdf'); setExportDialogOpen(true); }} className="gap-2 shadow-sm hover:shadow transition-all" disabled={isLoading || formattedData.length === 0}>
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">Export PDF</span>
            <span className="sm:hidden">PDF</span>
          </Button>
        </div>
      </div>

      <Card className="border-border/50 shadow-md overflow-hidden rounded-xl">
        <CardHeader className="bg-slate-50/50 border-b border-border/50 pb-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="text-xl">Jobs Overview</CardTitle>
              <CardDescription>Comprehensive database of all company jobs</CardDescription>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search jobs..."
                className="pl-9 bg-white shadow-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <Accordion type="multiple" defaultValue={['DA', 'TB', 'AI']} className="w-full space-y-4">
            <AccordionItem value="DA" className="border rounded-lg bg-white overflow-hidden shadow-sm">
              <AccordionTrigger className="px-4 py-3 bg-slate-50 hover:bg-slate-100 font-semibold text-lg text-slate-800 transition-colors">
                <div className="flex items-center gap-2">
                  <span>Design Asia (DA)</span>
                  <Badge variant="secondary" className="ml-2">{groupedData.DA.length}</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="p-0 border-t">
                {renderTable(groupedData.DA)}
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="TB" className="border rounded-lg bg-white overflow-hidden shadow-sm">
              <AccordionTrigger className="px-4 py-3 bg-slate-50 hover:bg-slate-100 font-semibold text-lg text-slate-800 transition-colors">
                <div className="flex items-center gap-2">
                  <span>Top Bass (TB)</span>
                  <Badge variant="secondary" className="ml-2">{groupedData.TB.length}</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="p-0 border-t">
                {renderTable(groupedData.TB)}
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="AI" className="border rounded-lg bg-white overflow-hidden shadow-sm">
              <AccordionTrigger className="px-4 py-3 bg-slate-50 hover:bg-slate-100 font-semibold text-lg text-slate-800 transition-colors">
                <div className="flex items-center gap-2">
                  <span>Alusion (AI)</span>
                  <Badge variant="secondary" className="ml-2">{groupedData.AI.length}</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="p-0 border-t">
                {renderTable(groupedData.AI)}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Select Export Category</DialogTitle>
            <DialogDescription>
              Which category's report would you like to export?
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <Button variant="outline" onClick={() => handleExport('DA')}>Design Asia (DA)</Button>
            <Button variant="outline" onClick={() => handleExport('TB')}>Top Bass (TB)</Button>
            <Button variant="outline" onClick={() => handleExport('AI')}>Alusion (AI)</Button>
            <Button onClick={() => handleExport('ALL')}>All Reports</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminJobReport;
